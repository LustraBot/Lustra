import { buildProfileView } from '../handlers/profile.js';

export default {
  name: "profile",
  description: "View and manage your private command stats.",
  execute: async (interaction) => {
    try {
      await interaction.defer(64);

      const { embed, components } = await buildProfileView(interaction);

      await interaction.createFollowup({
        embeds: [embed],
        components,
        flags: 64,
      });
    } catch (error) {
      console.error('[Profile Command] Failed to send profile view:', error);
      await interaction.createFollowup({
        embeds: [
          {
            title: "Profile Unavailable",
            description: "Something went wrong while loading your stats. Please try again in a moment.",
            color: 0xcdb4db,
          },
        ],
        flags: 64,
      });
    }
  },
};
