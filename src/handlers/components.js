import { Constants } from 'eris';
import { upsertAutoHentaiConfig, disableAutoHentai, getAutoHentaiConfig } from '../db.js';
import { rescheduleAutoHentai } from '../automation/hentaiAuto.js';

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

export async function handleComponentInteraction(i) {
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

export { createInviteButton };
