const formatNumber = (value) => value.toLocaleString('en-US');

export default {
  name: "total",
  description: "Display total guilds, members and bots for Lustra.",
  execute: async (interaction) => {
    await interaction.defer();

    const client = interaction._client;

    const totalGuilds = client.guilds?.size ?? 0;

    let totalMembers = 0;
    for (const guild of client.guilds?.values() ?? []) {
      totalMembers += guild?.memberCount ?? 0;
    }

    let totalBots = 0;
    for (const guild of client.guilds?.values() ?? []) {
      if (!guild?.members) {
        continue;
      }

      for (const member of guild.members.values()) {
        if (member.bot) {
          totalBots += 1;
        }
      }
    }

    const embed = {
      title: "<:note:1421910167775084646> Network Totals",
      color: 0xcdb4db,
      fields: [
        {
          name: "<:tools:1421910719255023626> Guilds",
          value: `\`\`\`\n${formatNumber(totalGuilds)}\n\`\`\``,
          inline: true,
        },
        {
          name: "<:hug:1422270833455403115> Members",
          value: `\`\`\`\n${formatNumber(totalMembers)}\n\`\`\``,
          inline: true,
        },
        {
          name: "<:questionsign:1421912836103475250> Bots",
          value: `\`\`\`\n${formatNumber(totalBots)}\n\`\`\``,
          inline: true,
        },
      ],
      footer: {
        text: "Totals calculated across all connected guilds.",
      },
    };

    await interaction.createFollowup({ embeds: [embed] });
  },
};
