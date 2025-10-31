import { Constants } from 'eris';
import { 
  upsertAutoHentaiConfig, 
  disableAutoHentai, 
  getAutoHentaiConfig, 
  addRestrictedChannel, 
  removeRestrictedChannel, 
  getRestrictedChannels 
} from '../db.js';
import { rescheduleAutoHentai } from '../automation/hentaiAuto.js';
import { handleProfileComponent } from './profile.js';

const pending = new Map();

function key(i) {
  const userId = i.member?.user?.id || i.user?.id || 'unknown';
  return `${i.guildID}:${userId}`;
}

function getPending(i) {
  const k = key(i);
  if (!pending.has(k)) pending.set(k, {});
  return pending.get(k);
}

function buildAutomationMain(current = {}) {
  const lines = [];
  if (current.channelId) lines.push(`Channel: <#${current.channelId}>`);
  if (current.mode) lines.push(`Mode: ${current.mode}`);
  if (current.intervalMs) lines.push(`Interval: ${Math.round(current.intervalMs / 60000)} minutes`);
  const desc = lines.length
    ? `Current config:\n- ${lines.join('\n- ')}\n\nUse the buttons below to change settings.`
    : `No configuration set yet. Use the buttons below to set channel, mode, and interval.`;

  return {
    embed: {
      color: 0xcdb4db,
      title: '<:cogwheelsilhouette:1421912845922078900> Automation',
      description: desc,
    },
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: 'Set Channel', custom_id: 'auto_h_stage_channel' },
          { type: 2, style: 2, label: 'Set Mode', custom_id: 'auto_h_stage_mode' },
          { type: 2, style: 2, label: 'Set Interval', custom_id: 'auto_h_stage_interval' },
        ],
      },
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: 'Save', custom_id: 'auto_h_save' },
          { type: 2, style: 2, label: 'Disable', custom_id: 'auto_h_disable' },
          { type: 2, style: 2, label: 'Status', custom_id: 'auto_h_status' },
          { type: 2, style: 2, label: 'Preview', custom_id: 'auto_h_preview' },
        ],
      },
    ],
  };
}

function buildChannelStage() {
  return {
    embed: { color: 0xcdb4db, title: '<:cogwheelsilhouette:1421912845922078900> Select Channel', description: 'Pick an age-restricted text channel.' },
    components: [
      { type: 1, components: [ { type: 8, custom_id: 'auto_h_channel', placeholder: 'Select NSFW channel', channel_types: [0] } ] },
      { type: 1, components: [ { type: 2, style: 2, label: 'Back', custom_id: 'auto_h_back' } ] },
    ],
  };
}

function buildModeStage() {
  return {
    embed: { color: 0xcdb4db, title: '<:cogwheelsilhouette:1421912845922078900> Select Mode', description: 'Choose what to send automatically.' },
    components: [
      { type: 1, components: [ { type: 3, custom_id: 'auto_h_mode', placeholder: 'Select mode', options: [ { label: 'Image', value: 'image' }, { label: 'GIF', value: 'gif' }, { label: 'Both', value: 'both' } ] } ] },
      { type: 1, components: [ { type: 2, style: 2, label: 'Back', custom_id: 'auto_h_back' } ] },
    ],
  };
}

function buildIntervalStage() {
  return {
    embed: { color: 0xcdb4db, title: '<:cogwheelsilhouette:1421912845922078900> Select Interval', description: 'How often should I post?' },
    components: [
      { type: 1, components: [ { type: 3, custom_id: 'auto_h_interval', placeholder: 'Select interval', options: [ { label: 'Every 5 minutes', value: '300000' }, { label: 'Every 15 minutes', value: '900000' }, { label: 'Every 30 minutes', value: '1800000' }, { label: 'Every 60 minutes', value: '3600000' } ] } ] },
      { type: 1, components: [ { type: 2, style: 2, label: 'Back', custom_id: 'auto_h_back' } ] },
    ],
  };
}

function createInviteButton(botUserId) {
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botUserId}&permissions=8&scope=bot%20applications.commands`;

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "invite me",
          url: inviteUrl
        }
      ]
    }
  ];
}

function createVoteButton() {
  const voteUrl = 'https://top.gg/bot/1421884850507354123/vote';

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Vote for me",
          url: voteUrl
        }
      ]
    }
  ];
}

export async function handleComponentInteraction(i) {
  if (i.data.component_type === 2 && i.data.custom_id === 'donate_crypto') {
    const cryptoEmbed = {
      title: 'Donate via Cryptocurrency',
      description: 'Thank you for considering a crypto donation! Your support helps keep Lustra running.\n\n' +
                   '**Bitcoin (BTC):**\n`bc1q4k9h2exmlg30cq640p2m4rlsg8nmrgtrgfrzrn`\n\n' +
                   '**Ethereum (ETH):**\n`0x3fDd707B9e0DdDA95c8Fe3CF04CDC4C537EA54A8`\n\n' +
                   '**Solana (SOL):**\n`2gt9DqNq6YQMugKuQEi6DySTQXVQVvJsyv9BdEs6Vij7`\n\n' +
                   'If you\'d like to donate with another crypto method, join our support server.',
      color: 0xcdb4db,
      type: 'rich',
    };

    const supportServerButton = {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: 'Join Support Server',
          url: 'https://discord.gg/qYtyCevmuw',
        },
      ],
    };
    await i.createMessage({ embeds: [cryptoEmbed], components: [supportServerButton], flags: 64 });
    return;
  }

  if (await handleProfileComponent(i)) {
    return;
  }

  if (i.data.component_type === 3 && i.data.custom_id === 'setup_menu') {
    const [value] = i.data.values;
    
    if (value === 'restrictions') {
      const channels = await getRestrictedChannels(i.guildID);
      const { embed, components } = buildRestrictionMain(i.guildID, channels);
      
      await i.createMessage({
        embeds: [embed],
        components,
        flags: 64
      });
      return;
    }
    
    if (value === 'automation') {
      const config = await getAutoHentaiConfig(i.guildID) || {};
      const { embed, components } = buildAutomationMain(config);
      
      await i.createMessage({
        embeds: [embed],
        components,
        flags: 64
      });
    }
    return;
  }
  
  if (i.data.component_type === 2 && i.data.custom_id?.startsWith('restrict_')) {
    const action = i.data.custom_id.split('_')[1];
    const channels = await getRestrictedChannels(i.guildID);
    
    if (action === 'back') {
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

      await i.createMessage({
        embeds: [embed],
        components,
        flags: 64
      });
      return;
    }
    
    if (action === 'add') {
      const guild = i._client.guilds.get(i.guildID);
      if (!guild) {
        return i.createMessage({
          content: 'Error: Guild not found',
          flags: 64
        });
      }

      const nsfwChannels = guild.channels.filter(channel =>
        channel.type === 0 && channel.nsfw
      );

      if (nsfwChannels.size === 0) {
        return i.createMessage({
          content: 'No NSFW text channels found in this server. Please create an NSFW channel first.',
          flags: 64
        });
      }

      const channelArray = Array.from(nsfwChannels.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      const chunks = [];
      for (let i = 0; i < channelArray.length; i += 25) {
        chunks.push(channelArray.slice(i, i + 25));
      }

      const components = [];

      chunks.forEach((chunk, index) => {
        const options = chunk.map(channel => ({
          label: `#${channel.name}`,
          value: channel.id,
          description: `Add ${channel.name} to allowed channels`
        }));

        const totalPages = chunks.length;
        const currentPage = index + 1;

        components.push({
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `add_channel_select_${index}`,
              placeholder: `Select an NSFW channel (${currentPage}/${totalPages})`,
              options: options,
              max_values: 1
            }
          ]
        });
      });

      components.push({
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            label: 'Cancel',
            custom_id: 'restrict_back',
            emoji: { id: '1421961111187624007', name: 'bownarrow' }
          }
        ]
      });

      await i.createMessage({
        content: `Found ${nsfwChannels.size} NSFW channel${nsfwChannels.size !== 1 ? 's' : ''}. Select one to allow hentai content:`,
        components: components,
        flags: 64
      });
      return;
    }
    
    if (action === 'remove' && channels.length > 0) {
      const channelOptions = channels.map(channelId => ({
        label: `#${i.channel.guild.channels.get(channelId)?.name || channelId}`,
        value: channelId,
        description: `Remove ${i.channel.guild.channels.get(channelId)?.name || channelId} from allowed channels`,
        emoji: { id: '1421910167775084646', name: 'note' }
      }));
      
      await i.createMessage({
        content: 'Select a channel to remove from allowed channels:',
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: 'remove_channel',
                placeholder: 'Select a channel to remove',
                options: channelOptions
              }
            ]
          }
        ],
        flags: 64
      });
      return;
    }
    
    if (action === 'remove') {
      await i.createMessage({
        content: 'There are no channels to remove.',
        flags: 64
      });
      return;
    }
  }
  
  if (i.data.component_type === 3 && i.data.custom_id?.startsWith('add_channel_select_')) {
    await i.acknowledge();

    const channelId = i.data.values?.[0];

    if (!channelId) {
      return i.createFollowup({
        content: 'Error: No channel selected',
        flags: 64
      });
    }

    const guild = i._client.guilds.get(i.guildID);
    const channel = guild?.channels.get(channelId);

    if (!channel) {
      return i.createFollowup({
        content: 'Error: Channel not found',
        flags: 64
      });
    }

    if (!channel.nsfw) {
      return i.createFollowup({
        content: `<#${channelId}> is not an age-restricted channel. Hentai content can only be posted in NSFW channels.`,
        flags: 64
      });
    }

    try {
      await addRestrictedChannel(i.guildID, channelId);
      const channels = await getRestrictedChannels(i.guildID);
      const { embed, components } = buildRestrictionMain(i.guildID, channels);

      await i.editOriginalMessage({
        content: `Added <#${channelId}> to allowed channels.`,
        embeds: [embed],
        components
      });
    } catch (error) {
      console.error('Error adding channel:', error);
      await i.editOriginalMessage({
        content: 'Failed to add channel. Please try again.',
        flags: 64
      });
    }
    return;
  }
  
  if (i.data.component_type === 3 && i.data.custom_id === 'remove_channel') {
    const [channelId] = i.data.values;
    
    if (!channelId) {
      return i.createMessage({
        content: 'Error: No channel ID provided',
        flags: 64
      });
    }
    
    await removeRestrictedChannel(i.guildID, channelId);
    
    const channels = await getRestrictedChannels(i.guildID);
    const { embed, components } = buildRestrictionMain(i.guildID, channels);
    
    await i.createMessage({
      content: `Removed <#${channelId}> from allowed channels.`,
      embeds: [embed],
      components,
      flags: 64
    });
    return;
  }
  try {
    if (i.type !== Constants.InteractionTypes.MESSAGE_COMPONENT) return;

    const customId = i.data?.custom_id;

    if (customId === 'setup_menu') {
      const value = i.data?.values?.[0];

      if (value === 'automation') {
        const existing = await getAutoHentaiConfig(i.guildID) || {};
        const { embed, components } = buildAutomationMain(existing);
        await i.createMessage({ embeds: [embed], components, flags: 64 });
      }
      return;
    }

    if (customId === 'auto_h_stage_channel') {
      const { embed, components } = buildChannelStage();
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }
    if (customId === 'auto_h_stage_mode') {
      const { embed, components } = buildModeStage();
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }
    if (customId === 'auto_h_stage_interval') {
      const { embed, components } = buildIntervalStage();
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }
    if (customId === 'auto_h_back') {
      const state = getPending(i);
      const { embed, components } = buildAutomationMain(state);
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_channel') {
      const p = getPending(i);
      const v = i.data?.values?.[0];
      p.channelId = v;
      const { embed, components } = buildAutomationMain(p);
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_mode') {
      const p = getPending(i);
      const v = i.data?.values?.[0];
      p.mode = v;
      const { embed, components } = buildAutomationMain(p);
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_interval') {
      const p = getPending(i);
      const v = i.data?.values?.[0];
      p.intervalMs = Number(v);
      const { embed, components } = buildAutomationMain(p);
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_save') {
      if (!i.member.permissions.has('manageGuild')) {
        return i.createMessage({ content: 'You need "manage guild" to do this.', flags: 64 });
      }
      const p = getPending(i);
      const guildId = i.guildID;
      if (!p.channelId) {
        return i.createMessage({ content: 'Please select a channel first.', flags: 64 });
      }

      const cfg = await upsertAutoHentaiConfig({
        guildId,
        channelId: p.channelId,
        mode: p.mode || 'both',
        intervalMs: Math.max(5 * 60 * 1000, Number.isFinite(p.intervalMs) ? Number(p.intervalMs) : 30 * 60 * 1000),
        enabled: true,
      });

      await rescheduleAutoHentai(i._client, guildId);
      const { embed, components } = buildAutomationMain(cfg);
      embed.title = 'Automation Saved';
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_disable') {
      if (!i.member.permissions.has('manageGuild')) {
        return i.createMessage({ content: 'You need "manage guild" to do this.', flags: 64 });
      }
      await disableAutoHentai(i.guildID);
      await rescheduleAutoHentai(i._client, i.guildID);
      const { embed, components } = buildAutomationMain({});
      embed.title = '<:cogwheelsilhouette:1421912845922078900> Automation Disabled';
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_status') {
      const cfg = await getAutoHentaiConfig(i.guildID) || {};
      const { embed, components } = buildAutomationMain(cfg);
      embed.title = '<:cogwheelsilhouette:1421912845922078900> Automation Status';
      return i.createMessage({ embeds: [embed], components, flags: 64 });
    }

    if (customId === 'auto_h_preview') {
      const p = getPending(i);
      const cfg = {
        channelId: p.channelId,
        mode: p.mode || 'both',
      };
      if (!cfg.channelId) {
        const existing = await getAutoHentaiConfig(i.guildID);
        if (existing) Object.assign(cfg, existing);
      }
      if (!cfg.channelId) {
        return i.createMessage({ content: 'Select a channel first, then try Preview.', flags: 64 });
      }
      try {
        const type = cfg.mode === 'both' ? (Math.random() < 0.5 ? 'image' : 'gif') : cfg.mode;
        const guild = i._client.guilds.get(i.guildID);
        const channel = guild?.channels.get(cfg.channelId);
        if (!channel) return i.createMessage({ content: 'I cannot access that channel.', flags: 64 });
        if (!channel.nsfw) return i.createMessage({ content: 'Channel must be age-restricted.', flags: 64 });
        const { getHentaiUrls } = await import('../commands/hentai.js');
        const urls = await getHentaiUrls(type, 1);
        if (!urls.length) return i.createMessage({ content: 'No preview available right now. Try again.', flags: 64 });
        await channel.createMessage({ embeds: [{ image: { url: urls[0] }, color: 0xcdb4db }] });
        return i.createMessage({ content: 'Preview sent.', flags: 64 });
      } catch (e) {
        console.error('Preview error:', e);
        return i.createMessage({ content: 'Failed to send preview.', flags: 64 });
      }
    }
  } catch (error) {
    console.error('cant handle component interaction:', error);
  }
}

function buildRestrictionMain(guildId, channels = []) {
  const channelList = channels.length > 0
    ? channels.map(id => `• <#${id}>`).join('\n')
    : 'No channels are currently allowed. The bot can post in any channel.';

  return {
    embed: {
      color: 0xcdb4db,
      title: '<:tools:1421910719255023626> Channel Restrictions',
      description: `**Allowed Channels:**\n${channelList}\n\nUse the buttons below to manage channel restrictions.`,
    },
    components: [
      {
        type: 1,
        components: [
          { 
            type: 2, 
            style: 2, 
            label: 'Add Channel', 
            custom_id: 'restrict_add',
            emoji: { id: '1421910347564187799', name: 'info' }
          },
          { 
            type: 2, 
            style: 2, 
            label: 'Remove Channel', 
            custom_id: 'restrict_remove',
            emoji: { id: '1421910167775084646', name: 'note' }
          },
          { 
            type: 2, 
            style: 2, 
            label: 'Back', 
            custom_id: 'restrict_back',
            emoji: { id: '1421961111187624007', name: 'bownarrow' }
          }
        ]
      }
    ]
  };
}

export { createInviteButton, createVoteButton };
