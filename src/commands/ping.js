export default {
    name: "ping",
    description: "Ping!",
    execute: async (i) => {
        const start = Date.now();
        await i.defer();
        const latency = Date.now() - start;

        const embed = {
            title: "<:pingpong:1421912856890310726> Pong!",
            color: 0xcdb4db,
            fields: [
                {
                    name: "<:star2:1421912827018612776> Latency",
                    value: `\`\`${latency}\`\`ms`,
                    inline: true,
                },
                {
                    name: "<:tools:1421910719255023626> API Latency",
                    value: `\`\`${Math.round(i._client.shards.get(0).latency)}\`\`ms`,
                    inline: true,
                }
            ],

        };

        await i.createFollowup({ embeds: [embed] });
    },
};
