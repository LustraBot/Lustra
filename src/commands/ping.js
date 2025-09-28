export default {
    name: "ping",
    description: "Ping!",
    execute: async (i) => {
        const start = Date.now();
        await i.createMessage("Pong!");
        const latency = Date.now() - start;
        await i.editMessage(`Pong!\nLatency: \`\`${latency}\`\`ms`);
    },
};
