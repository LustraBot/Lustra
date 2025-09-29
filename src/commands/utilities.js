import fetch from 'node-fetch';

const cooldowns = new Map();

async function fetchBlahajUrl() {
  const res = await fetch('https://blahaj.4k.pics/', { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/<img[^>]*id=["']displayed-image["'][^>]*src=["']([^"']+)["']/i);
  if (!m) return null;
  const src = m[1];
  try {
    const absolute = new URL(src, 'https://blahaj.4k.pics/').toString();
    return absolute;
  } catch {
    return src;
  }
}

export default {
  name: 'blahaj',
  description: 'cute blahaj :3',
  options: [],
  execute: async (interaction) => {
    try {
      const userId = interaction.member?.user?.id || interaction.user?.id;
      const now = Date.now();
      const cdMs = 3000;
      const last = cooldowns.get(userId) || 0;
      const remaining = last + cdMs - now;
      if (remaining > 0) {
        const seconds = Math.ceil(remaining / 1000);
        const embed = {
          title: 'Cooldown Active',
          description: `Please wait ${seconds} second${seconds !== 1 ? 's' : ''} before using this command again.`,
          color: 0xcdb4db,
        };
        return interaction.createMessage({ embeds: [embed], flags: 64 });
      }
      cooldowns.set(userId, now);
      setTimeout(() => cooldowns.delete(userId), cdMs);

      const url = await fetchBlahajUrl();
      if (!url) {
        return interaction.createMessage({
          embeds: [
            {
              title: 'No Image Found',
              description: 'I couldn\'t fetch a Blåhaj right now. Please try again in a moment.',
              color: 0xcdb4db,
            },
          ],
          flags: 64,
        });
      }

      const embed = {
        image: { url },
        color: 0xcdb4db,
      };
      await interaction.createMessage({ embeds: [embed] });
    } catch (err) {
      console.error('blahaj cmd error:', err);
      return interaction.createMessage({
        embeds: [
          {
            title: 'Unexpected Error',
            description: 'Something went wrong while fetching Blåhaj. Please try again.',
            color: 0xcdb4db,
          },
        ],
        flags: 64,
      });
    }
  },
};

