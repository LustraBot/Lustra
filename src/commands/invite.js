import { createInviteButton } from '../handlers/components.js';

export default {
  name: "invite",
  description: "invite me",
  execute: async (interaction) => {
    const botUserId = interaction._client.user.id;
    const components = createInviteButton(botUserId);

    await interaction.createMessage({ components });
  },
};
