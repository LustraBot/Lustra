export default {
    name: "ping",
    description: "Ping!",
    execute: async (i) => {
        const start = Date.now();
        await i.defer();
        const latency = Date.now() - start;

        const embed = {
            title: "Pong!",
            color: 0xcdb4db,
            fields: [
                {
                    name: "Latency",
                    value: `\`\`${latency}\`\`ms`,
                    inline: true,
                },
                {
                    name: "API Latency",
                    value: `\`\`${Math.round(i._client.shards.get(0).latency)}\`\`ms`,
                    inline: true,
                }
            ],

        };

        await i.createFollowup({ embeds: [embed] });
    },
};
