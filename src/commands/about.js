export default {
  name: "about",
  description: "info about the bot",
  execute: async (interaction) => {
    const embed = {
      title: "<:info:1421910347564187799> About Lustra",
      color: 0xcdb4db,
      fields: [
        {
          name: "<:note:1421910167775084646> Description",
          value: "• Discord bot designed for quick access to NSFW content with efficient delivery\n• Cut your time searching for content down to a few seconds",
          inline: false,
        },
        {
          name: "<:star2:1421912827018612776> Features",
          value: "• Fast image & gif delivery\n• Smart rate limiting\n• NSFW channel detection\n• Multiple content sources",
          inline: false,
        },
        {
          name: "<:version:1421910629970743316> Version",
          value: "`1.0.0`",
          inline: true,
        },
        {
          name: "<:tools:1421910719255023626> Built With",
          value: "Node.js & Eris",
          inline: true,
        },
      ],
      footer: {
        text: "Made for efficiency • Open Source",
      },
    };

    const components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "GitHub",
            url: "https://github.com/brutiv/Lustra"
          },
          {
            type: 2,
            style: 5,
            label: "Support Server",
            url: "https://discord.gg/W7MttaRT"
          }
        ]
      }
    ];

    await interaction.createMessage({ embeds: [embed], components });
  },
};
