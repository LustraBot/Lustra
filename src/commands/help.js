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
        description: "**Complete guide to all available commands**",
        color: 0xcdb4db,
        fields: [
          {
            name: "<:pingpong:1421912856890310726> `/ping`",
            value: 
              "**Test bot responsiveness**\n" +
              "```\n" +
              "Shows command execution time\n" +
              "Displays Discord API latency\n" +
              "```",
            inline: true,
          },
          {
            name: "<:questionsign:1421912836103475250> `/help`",
            value: 
              "**Access help system**\n" +
              "```\n" +
              "commands: true/false\n" +
              "Toggle detailed view\n" +
              "```",
            inline: true,
          },
          {
            name: "<:info:1421910347564187799> `/about`",
            value: 
              "**Learn about Lustra**\n" +
              "```\n" +
              "Bot information\n" +
              "Developer links\n" +
              "```",
            inline: true,
          },
          {
            name: "<:hug:1422270833455403115> `/anime`",
            value: 
              "**SFW anime content**\n" +
              "```yaml\n" +
              "type:     image | gif\n" +
              "category: gif type\n" +
              "```\n" +
              "Works in any channel",
            inline: true,
          },
          {
            name: "<:plus18movie:1421912864876400770> `/hentai`",
            value: 
              "**NSFW content (18+)**\n" +
              "```yaml\n" +
              "type:  image | gif\n" +
              "count: 1-10 items\n" +
              "```\n" +
              "Requires NSFW channel",
            inline: true,
          },
        ],
        footer: {
          text: "Tip: Use /help without options to see the welcome guide"
        }
      };

      await interaction.createMessage({ embeds: [embed] });
    } else {
      const embed = {
        title: "<:star2:1421912827018612776> Welcome to Lustra",
        description: 
          "**Fast, efficient content delivery for Discord**\n\n" +
          "Quick access to anime content with smart caching and built-in rate limiting.",
        color: 0xcdb4db,
        fields: [
          {
            name: "<:note:1421910167775084646> Getting Started",
            value: 
              "```\n" +
              "/help commands:true  → View all commands\n" +
              "/anime               → Get anime content\n" +
              "/about               → Bot information\n" +
              "```",
            inline: false,
          },
          {
            name: "<:tools:1421910719255023626> Key Features",
            value: 
              "<:star2:1421912827018612776> Fast content delivery with smart caching\n" +
              "<:star2:1421912827018612776> Rate limiting and cooldown protection\n" +
              "<:star2:1421912827018612776> Multiple content sources\n" +
              "<:star2:1421912827018612776> Clean, organized responses",
            inline: false,
          },
          {
            name: "<:plus18movie:1421912864876400770> NSFW Guidelines",
            value: 
              "<:note:1421910167775084646> Adult content requires NSFW channels\n" +
              "<:note:1421910167775084646> Built-in cooldowns prevent spam\n" +
              "<:note:1421910167775084646> Bulk requests supported (1-10 items)",
            inline: false,
          },
          {
            name: "<:questionsign:1421912836103475250> Support & Help",
            value: 
              "`/help commands:true` → Detailed command list\n" +
              "`/about` → Bot information and links\n" +
              "Join our support server for assistance",
            inline: false,
          },
        ],
        footer: {
          text: "Type /help commands:true to see all available commands"
        }
      };

      await interaction.createMessage({ embeds: [embed] });
    }
  },
};
