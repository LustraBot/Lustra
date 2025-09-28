import { pingDB } from '../db.js';

export default {
    name: "ping",
    description: "Ping!",
    execute: async (i) => {
        const start = Date.now();
        await i.defer();
        const latency = Date.now() - start;

        let dbPing = await pingDB();
        let dbPingText = dbPing !== null ? `\`\`${dbPing}\`\`ms` : 'Failed';

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
                    value: `• Uptime: \`\`${Math.floor(i._client.uptime / 1000)}s\`\``,
                    inline: false,
                }
            ],
        };

        await i.createFollowup({ embeds: [embed] });
    },
};
