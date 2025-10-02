import { createVoteButton } from '../handlers/components.js';

export default {
  name: "vote",
  description: "vote on topgg",
  execute: async (interaction) => {
    const components = createVoteButton();

    await interaction.createMessage({
      content: "Thanks for considering voting for me! Voting helps me grow and improve.",
      components
    });
  },
};