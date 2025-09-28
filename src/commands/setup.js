export default {
  name: "setup",
  description: "setup stuff",
  execute: async (i) => {
    const embed = {
      color: 0xcdb4db,
      title: "ignore",
      description: "ignore for test",
    };

    await i.createMessage({ embeds: [embed] });
  },
};
