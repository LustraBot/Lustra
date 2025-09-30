import { pingDB } from '../db.js';
import { botStartTime } from '../index.js';

const cooldowns = new Map();

export default {
  name: "ping",
  description: "Ping!",
  execute: async (i) => {
    const userId = i?.member?.user?.id || i?.user?.id;
    const now = Date.now();
    const COOLDOWN_MS = 5000;

    if (userId) {
      if (cooldowns.has(userId)) {
        const expiresAt = cooldowns.get(userId) + COOLDOWN_MS;
        if (now < expiresAt) {
          const timeLeft = Math.ceil((expiresAt - now) / 1000);
          const embed = {
            title: "Cooldown Active",
            description: `Please wait ${timeLeft} second${timeLeft !== 1 ? "s" : ""} before using this command again.`,
            color: 0xcdb4db,
          };
          return i.createMessage?.({ embeds: [embed], flags: 64 }) 
              || i.createFollowup?.({ embeds: [embed], flags: 64 });
        }
      }
      cooldowns.set(userId, now);
      setTimeout(() => cooldowns.delete(userId), COOLDOWN_MS);
    }

    const start = Date.now();
    await i.defer();
    const latency = Date.now() - start;

    let dbPing = await pingDB();
    let dbPingText = dbPing !== null ? `\`\`${dbPing}\`\`ms` : 'Failed';

    const startTimestamp = Math.floor(botStartTime / 1000);

    const embed = {
      title: "Bot Information",
      color: 0xcdb4db,
      fields: [
        {
          name: "<:cogwheelsilhouette:1421912845922078900> Bot Stats",
          value: `• Latency: \`\`${latency}\`\`ms\n• API Latency: \`\`${Math.round(i._client.shards.get(0).latency)}\`\`ms\n• Database Ping: ${dbPingText}`,
          inline: false,
        },
        {
          name: "<:tools:1421910719255023626> Information",
          value: `• Started: <t:${startTimestamp}:f>`,
          inline: false,
        }
      ],
    };

    await i.createFollowup({ embeds: [embed] });
  },
};
