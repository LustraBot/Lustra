import fetch from 'node-fetch';

const cooldowns = new Map();

export default {
  name: 'fact',
  description: 'Get a random fun fact',
  execute: async (interaction) => {
    const userId = interaction.member?.user?.id || interaction.user?.id;
    const now = Date.now();
    const COOLDOWN_MS = 5000;

    if (userId) {
      if (cooldowns.has(userId)) {
        const expiresAt = cooldowns.get(userId) + COOLDOWN_MS;
        if (now < expiresAt) {
          const timeLeft = Math.ceil((expiresAt - now) / 1000);
          const embed = {
            title: 'Cooldown Active',
            description: `Please wait ${timeLeft} second${timeLeft !== 1 ? 's' : ''} before using this command again.`,
            color: 0xcdb4db,
          };
          return interaction.createMessage({ embeds: [embed], flags: 64 });
        }
      }
      cooldowns.set(userId, now);
      setTimeout(() => cooldowns.delete(userId), COOLDOWN_MS);
    }

    try {
      await interaction.defer();

      const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random');
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const fact = data?.text || 'Could not fetch a fact right now.';

      await interaction.createFollowup({ content: `<:dot:1422607586867281970> ${fact}` });
    } catch (error) {
      console.error('[Fun] Error fetching fact:', error);
      
      const errorEmbed = {
        title: 'Error',
        description: 'Failed to fetch a random fact. Please try again later.',
        color: 0xcdb4db,
      };
      
      await interaction.createFollowup({ embeds: [errorEmbed] });
    }
  },
};