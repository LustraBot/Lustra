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
