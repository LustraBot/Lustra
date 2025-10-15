import {
  getUserProfile,
  optInUserProfile,
  optOutUserProfile,
  recordCommandUsage,
} from '../db.js';

const EMOJIS = {
  headline: '<:star2:1421912827018612776>',
  status: '<:tools:1421910719255023626>',
  usage: '<:note:1421910167775084646>',
  favourite: '<:pingpong:1421912856890310726>',
  guild: '<:welcome:1421961099871391776>',
  warning: '<:questionsign:1421912836103475250>',
  success: '<:heart:1421961074751569960>',
  danger: '<:plus18movie:1421912864876400770>',
  refresh: '<:cogwheelsilhouette:1421912845922078900>',
};

export const PROFILE_CUSTOM_IDS = {
  optIn: 'profile_opt_in',
  optOut: 'profile_opt_out',
  refresh: 'profile_refresh',
};

function toLocale(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function toRelative(date) {
  if (!date) return 'Never';
  const ts = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${ts}:R>`;
}

function getAvatarURL(user) {
  if (!user?.id) return undefined;
  if (user.avatar) {
    const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=256`;
  }
  const discriminator = Number(user.discriminator ?? 0);
  const defaultIndex = Number.isNaN(discriminator) ? 0 : discriminator % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function pickTopEntries(counts = {}, limit = 3) {
  return Object.entries(counts || {})
    .sort(([, aCount], [, bCount]) => (bCount ?? 0) - (aCount ?? 0))
    .slice(0, limit);
}

function buildTopCommands(profile) {
  const top = pickTopEntries(profile?.commandCounts, 3);
  if (!top.length) {
    return `${EMOJIS.warning} No command history yet.`;
  }

  return top
    .map(
      ([command, count]) =>
        `\`${command}\` • ${toLocale(count)}`
    )
    .join('\n');
}

function buildTopGuild(profile) {
  const top = pickTopEntries(profile?.guildCounts, 1);
  if (!top.length) {
    return `${EMOJIS.warning} Run commands to populate this section.`;
  }

  const [guildId, count] = top[0];
  return `<#${guildId}> • ${toLocale(count)} command${count === 1 ? '' : 's'}`;
}

function buildStatusLine(profile) {
  if (profile?.optedIn) {
    const since = profile.firstOptInAt
      ? `since ${toRelative(profile.firstOptInAt)}`
      : 'currently enabled';
    return `${EMOJIS.success} **Tracking Enabled** ${since}`;
  }
  if (profile) {
    return `${EMOJIS.warning} Tracking paused — opt back in anytime.`;
  }
  return `${EMOJIS.warning} Tracking is disabled. Opt in to start collecting stats.`;
}

function buildDescription(profile) {
  if (profile?.optedIn) {
    return 'Slash command usage is being tracked privately for your account.';
  }
  return 'Opt in to let Lustra build a private command history just for you.';
}

function buildComponents(profile) {
  const components = [];

  if (profile?.optedIn) {
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 4,
          label: 'Opt Out',
          custom_id: PROFILE_CUSTOM_IDS.optOut,
          emoji: { id: '1421912864876400770', name: 'plus18movie' },
        },
        {
          type: 2,
          style: 2,
          label: 'Refresh',
          custom_id: PROFILE_CUSTOM_IDS.refresh,
          emoji: { id: '1421912845922078900', name: 'cogwheelsilhouette' },
        },
      ],
    });
  } else {
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Opt In',
          custom_id: PROFILE_CUSTOM_IDS.optIn,
          emoji: { id: '1421961074751569960', name: 'heart' },
        },
        {
          type: 2,
          style: 2,
          label: 'Refresh',
          custom_id: PROFILE_CUSTOM_IDS.refresh,
          emoji: { id: '1421912845922078900', name: 'cogwheelsilhouette' },
        },
      ],
    });
  }

  return components;
}

export function buildProfileEmbed(user, profile) {
  const totalCommands = profile?.totalCommands ?? 0;
  const lastUsed =
    profile?.lastCommandName && profile?.lastCommandAt
      ? `\`${profile.lastCommandName}\` • ${toRelative(profile.lastCommandAt)}`
      : 'No recent usage';

  const embed = {
    title: `${EMOJIS.headline} Command Profile`,
    description: buildDescription(profile),
    color: 0xcdb4db,
    fields: [
      {
        name: `${EMOJIS.status} Status`,
        value: buildStatusLine(profile),
        inline: false,
      },
      {
        name: `${EMOJIS.usage} Usage Summary`,
        value: [
          `Total Commands • ${toLocale(totalCommands)}`,
          `Last Command • ${lastUsed}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: `${EMOJIS.favourite} Top Commands`,
        value: buildTopCommands(profile),
        inline: false,
      },
      {
        name: `${EMOJIS.guild} Active Server`,
        value: buildTopGuild(profile),
        inline: false,
      },
    ],
    footer: {
      text: 'Stats stay private. Opt out anytime to pause tracking.',
    },
  };

  const avatarUrl = getAvatarURL(user);
  if (avatarUrl) {
    embed.thumbnail = { url: avatarUrl };
  }

  return embed;
}

export async function buildProfileView(interaction, profileOverride = null) {
  const user = interaction.member?.user || interaction.user;
  const profile =
    profileOverride || (user?.id ? await getUserProfile(user.id) : null);

  return {
    profile,
    embed: buildProfileEmbed(user, profile),
    components: buildComponents(profile),
  };
}

export async function handleProfileComponent(interaction) {
  const customId = interaction.data?.custom_id;
  if (!customId || !customId.startsWith('profile_')) {
    return false;
  }

  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (!userId) {
    await interaction.createMessage({
      content: 'Unable to identify the requesting user.',
      flags: 64,
    });
    return true;
  }

  if (customId === PROFILE_CUSTOM_IDS.optIn) {
    const profile = await optInUserProfile(userId);
    await interaction.deferUpdate();
    const view = await buildProfileView(interaction, profile);
    await interaction.editParent({
      embeds: [view.embed],
      components: view.components,
    });
    return true;
  }

  if (customId === PROFILE_CUSTOM_IDS.optOut) {
    await optOutUserProfile(userId);
    await interaction.deferUpdate();
    const view = await buildProfileView(interaction);
    await interaction.editParent({
      embeds: [view.embed],
      components: view.components,
    });
    return true;
  }

  if (customId === PROFILE_CUSTOM_IDS.refresh) {
    await interaction.deferUpdate();
    const view = await buildProfileView(interaction);
    await interaction.editParent({
      embeds: [view.embed],
      components: view.components,
    });
    return true;
  }

  return false;
}

export async function trackCommandUsage(interaction) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (!userId) return false;
  const commandName = interaction.data?.name;
  if (!commandName) return false;
  const guildId = interaction.guildID;

  try {
    return await recordCommandUsage({ userId, commandName, guildId });
  } catch (error) {
    console.error('[Profile] Failed to record command usage:', error);
    return false;
  }
}
