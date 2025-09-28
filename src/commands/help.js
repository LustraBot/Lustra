export default {
  name: "help",
  description: "get help with the bot",
  options: [
    {
      name: "commands",
  description: "shows available commands",
      type: 5,
      required: false,
    },
  ],
  execute: async (interaction) => {
    const showCommands = interaction.data.options?.find(
      (opt) => opt.name === "commands"
    )?.value;

    if (showCommands) {
      const embed = {
        title: "📋 Available Commands",
        color: 0xcdb4db,
        fields: [
          {
            name: "🏓 `/ping`",
            value: "Check bot latency and response time",
            inline: false,
          },
          {
            name: "🔞 `/hentai`",
            value: "**Options:**\n• `type:` image or gif\n• `count:` 1-10 items",
            inline: false,
          },
          {
            name: "⚙️ `/setup`",
            value: "Configuration and setup options",
            inline: false,
          },
          {
            name: "❓ `/help`",
            value: "Show help information and commands",
            inline: false,
          },
          {
            name: "ℹ️ `/about`",
            value: "Information about the bot",
            inline: false,
          },
        ],
      };

      await interaction.createMessage({ embeds: [embed] });
    } else {
      const embed = {
        title: "🚀 Lustra Help",
        description: "Quick access bot for Discord content",
        color: 0xcdb4db,
        fields: [
          {
            name: "📚 View Commands",
            value: "Use `/help commands:true` to see all available commands",
            inline: false,
          },
          {
            name: "🔞 NSFW Notice",
            value: "Adult content commands only work in NSFW channels",
            inline: false,
          },
        ],
        footer: {
          text: "Use /about for more information"
        }
      };

      await interaction.createMessage({ embeds: [embed] });
    }
  },
};
