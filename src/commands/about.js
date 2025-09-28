export default {
  name: "about",
  description: "info about the bot",
  execute: async (interaction) => {
    const embed = {
      title: "ℹ️ About Lustra",
      description: "Cut your gooning time down to a few seconds 🔥",
      color: 0xcdb4db,
      fields: [
        {
          name: "📝 Description",
          value: "Discord bot designed for quick access to NSFW content with efficient delivery",
          inline: false,
        },
        {
          name: "✨ Features",
          value: "• Fast image & gif delivery\n• Smart rate limiting\n• NSFW channel detection\n• Multiple content sources",
          inline: false,
        },
        {
          name: "📊 Version",
          value: "`1.0.0`",
          inline: true,
        },
        {
          name: "🛠️ Built With",
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
            emoji: { name: "⭐" },
            url: "https://github.com/brutiv/Lustra"
          },
          {
            type: 2,
            style: 5,
            label: "Support Server",
            emoji: { name: "💬" },
            url: "https://discord.gg/W7MttaRT"
          }
        ]
      }
    ];

    await interaction.createMessage({ embeds: [embed], components });
  },
};
