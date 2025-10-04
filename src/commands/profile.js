export default {
  name: "profile",
  description: "view your user profile with stats",
  execute: async (interaction) => {
    return interaction.createMessage({
      embeds: [
        {
          title: "Profile Command",
          description: "In development",
          color: 0xcdb4db,
        },
      ],
    });
  },
};
