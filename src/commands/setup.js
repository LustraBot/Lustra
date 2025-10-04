import { getRestrictedChannels } from '../db.js';

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
    const restrictedChannels = await getRestrictedChannels(i.guildID);
    const restrictionStatus = restrictedChannels.length > 0 
      ? `Enabled (${restrictedChannels.length} channel${restrictedChannels.length !== 1 ? 's' : ''} allowed)`
      : 'Disabled (bot can post in any channel)';

    const embed = {
      color: 0xcdb4db,
      title: "<:cogwheelsilhouette:1421912845922078900> Lustra Setup",
      description: `Here you can setup Lustra features and configurations.\n\n**Channel Restrictions:** ${restrictionStatus}`,
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
                },
              },
              {
                label: "Channel Restrictions",
                value: "restrictions",
                description: "Manage which channels the bot can post in",
                emoji: {
                  id: "1421910719255023626",
                  name: "tools"
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

    setTimeout(() => {
      try {
        if (!msg || typeof msg.edit !== 'function') return;
        const disabled = [
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
                    emoji: { id: "1421912845922078900", name: "cogwheelsilhouette" }
                  }
                ],
                disabled: true
              }
            ]
          }
        ];
        msg.edit({ components: disabled }).catch(() => {});
      } catch {}
    }, 60000);
  },
};
