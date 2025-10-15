export default {
  name: "legal",
  description: "View Lustra's Terms of Service and Privacy Policy",
  execute: async (interaction) => {
    const embed = {
      title: "Terms & Privacy",
      description:
        "You can access our Terms of Service and Privacy Policy using the buttons below.",
      color: 0xcdb4db,
    };

    const components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Terms of Service",
            url: "https://gxav.info/lustra/tos",
          },
          {
            type: 2,
            style: 5,
            label: "Privacy Policy",
            url: "https://gxav.info/lustra/privacy",
          },
        ],
      },
    ];

    await interaction.createMessage({ embeds: [embed], components });
  },
};
