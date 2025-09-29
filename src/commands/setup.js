export default {
  name: "setup",
  description: "setup stuff",
  defaultMemberPermissions: ['manageGuild'],
  execute: async (i) => {
    if (!i.member.permissions.has('manageGuild')) {
      return i.createMessage({
        content: 'You need "manage guild" to run this btw',
        flags: 64
      });
    }
    const embed = {
      color: 0xcdb4db,
      title: "<:cogwheelsilhouette:1421912845922078900> Lustra Setup",
      description: "Here you can setup Lustra features and configurations.",
    };

    const components = [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: "setup_menu",
            placeholder: "Select an option",
            options: [
              {
                label: "Automation",
                value: "automation",
                description: "Configure automation features",
                emoji: {
                  id: "1421912845922078900",
                  name: "cogwheelsilhouette"
                }
              }
            ]
          }
        ]
      }
    ];

    const msg = await i.createMessage({ 
      embeds: [embed], 
      components
    });

    const collector = i.channel.createComponentCollector({ time: 60000 });

    collector.on('collect', async (component) => {
      if (component.data.custom_id !== 'setup_menu') return;
      if (component.user.id !== i.user.id) return;
      
      const value = component.data.values[0];
      
      if (value === 'automation') {
        const automationEmbed = {
          color: 0xcdb4db,
          title: "Automation",
          description: "test"
        };

        const automationComponents = [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: "placeholder",
                custom_id: "placeholder"
              }
            ]
          }
        ];

        await i.createMessage({
          embeds: [automationEmbed],
          components: automationComponents,
          flags: 64
        });
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
