export default {
    name: 'setup',
    description: 'setup stuff',
    execute: async (i) => {
        const embed = {
            description: "Setup",
            color: 0xcdb4db
        };

        await i.createMessage({ embed: embed });
    },
};
