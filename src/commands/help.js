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
        title: "<:note:1421910167775084646> Command List",
        description: "Complete guide to all available commands",
        color: 0xcdb4db,
        fields: [
          {
            name: "<:pingpong:1421912856890310726> `/ping`",
            value: "Test bot responsiveness and check connection quality\n• Shows command execution time\n• Displays Discord API latency",
            inline: false,
          },
          {
            name: "<:plus18movie:1421912864876400770> `/hentai`",
            value: "Access NSFW content quickly and efficiently\n• `type:` Choose between `image` or `gif`\n• `count:` Request 1-10 items at once\n• Requires NSFW channel\n• Built-in cooldown protection",
            inline: false,
          },
          {
            name: "<:hug:1422270833455403115> `/anime`",
            value: "Access SFW anime content with variety\n• `type:` Choose between `image` or `gif`\n• `category:` Pick specific gif type (optional)\n• Works in any channel\n• Shows anime names as titles",
            inline: false,
          },
          {
            name: "<:questionsign:1421912836103475250> `/help`",
            value: "Access this help system\n• `commands: true` - Show detailed command list\n• `commands: false` - Show general help info",
            inline: false,
          },
          {
            name: "<:info:1421910347564187799> `/about`",
            value: "Learn about Lustra bot\n• Bot information and features\n• Developer links and support",
            inline: false,
          },
        ],
        footer: {
          text: "Use /about for more information about the bot"
        }
      };

      await interaction.createMessage({ embeds: [embed] });
    } else {
      const embed = {
        title: "<:star2:1421912827018612776> Welcome to Lustra",
        description: "Your efficient Discord bot for quick content access",
        color: 0xcdb4db,
        fields: [
          {
            name: "<:note:1421910167775084646> Getting Started",
            value: "• Use `/help commands:true` to see all available commands\n• Most features work in any channel\n• NSFW commands require NSFW channels",
            inline: false,
          },
          {
            name: "<:tools:1421910719255023626> Key Features",
            value: "• Fast content delivery with smart caching\n• Rate limiting protection\n• Multiple content sources\n• Clean, organized responses",
            inline: false,
          },
          {
            name: "<:plus18movie:1421912864876400770> NSFW Guidelines",
            value: "• Adult content only works in NSFW channels\n• Built-in cooldowns prevent spam\n• Multiple items delivered efficiently",
            inline: false,
          },
          {
            name: "<:questionsign:1421912836103475250> Need Help?",
            value: "• Use `/about` for bot information\n• Join our support server for assistance\n• Check command descriptions for usage tips",
            inline: false,
          },
        ],
        footer: {
          text: "Type /help commands:true to see detailed command information"
        }
      };

      await interaction.createMessage({ embeds: [embed] });
    }
  },
};
