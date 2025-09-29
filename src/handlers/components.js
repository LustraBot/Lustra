import { Constants } from 'eris';

export async function handleComponentInteraction(i) {
  try {
    if (i.type !== Constants.InteractionTypes.MESSAGE_COMPONENT) return;

    const customId = i.data?.custom_id;

    if (customId === 'setup_menu') {
      const value = i.data?.values?.[0];

      if (value === 'automation') {
        const automationEmbed = {
          color: 0xcdb4db,
          title: 'Automation',
          description: 'test',
        };

        const automationComponents = [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: 'placeholder',
                custom_id: 'placeholder',
              },
            ],
          },
        ];

        await i.createMessage({
          embeds: [automationEmbed],
          components: automationComponents,
          flags: 64,
        });
      }
    }
  } catch (error) {
    console.error('Error handling component interaction:', error);
  }
}
