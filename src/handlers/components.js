import { Constants } from 'eris';
import { upsertAutoHentaiConfig, disableAutoHentai } from '../db.js';
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

function buildAutomationComponents(current = {}) {
  return [
    {
      type: 1,
      components: [
        {
          type: 8, 
          custom_id: 'auto_h_channel',
          placeholder: 'Select NSFW channel',
          channel_types: [0],
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'auto_h_mode',
          placeholder: 'Select mode',
          options: [
            { label: 'Image', value: 'image' },
            { label: 'GIF', value: 'gif' },
            { label: 'Both', value: 'both' },
          ],
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'auto_h_interval',
          placeholder: 'Select interval',
          options: [
            { label: 'Every 5 minutes', value: '300000' },
            { label: 'Every 15 minutes', value: '900000' },
            { label: 'Every 30 minutes', value: '1800000' },
            { label: 'Every 60 minutes', value: '3600000' },
          ],
        },
      ],
    },
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: 'Save', custom_id: 'auto_h_save' },
        { type: 2, style: 4, label: 'Disable', custom_id: 'auto_h_disable' },
      ],
    },
  ];
}

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
          description: 'Configure automatic NSFW sending. Choose a channel (NSFW), mode, and interval, then press Save.',
        };

        await i.createMessage({
          embeds: [automationEmbed],
          components: buildAutomationComponents(),
          flags: 64,
        });
      }
      return;
    }

    if (customId === 'auto_h_channel') {
      const p = getPending(i);
      const v = i.data?.values?.[0];
      p.channelId = v;
      return i.createMessage({ content: 'Channel selected.', flags: 64 });
    }

    if (customId === 'auto_h_mode') {
      const p = getPending(i);
      const v = i.data?.values?.[0];
      p.mode = v;
      return i.createMessage({ content: 'Mode selected.', flags: 64 });
    }

    if (customId === 'auto_h_interval') {
      const p = getPending(i);
      const v = i.data?.values?.[0];
      p.intervalMs = Number(v);
      return i.createMessage({ content: 'Interval selected.', flags: 64 });
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
        intervalMs: Math.max(5 * 60 * 1000, Number(p.intervalMs) || 30 * 60 * 1000),
        enabled: true,
      });

      await rescheduleAutoHentai(i._client, guildId);
      return i.createMessage({
        embeds: [
          {
            color: 0xcdb4db,
            title: 'Automation Saved',
            description: `Channel <#${cfg.channelId}>, mode ${cfg.mode}, every ${Math.round(cfg.intervalMs / 60000)} min.`,
          },
        ],
        flags: 64,
      });
    }

    if (customId === 'auto_h_disable') {
      if (!i.member.permissions.has('manageGuild')) {
        return i.createMessage({ content: 'You need "manage guild" to do this.', flags: 64 });
      }
      await disableAutoHentai(i.guildID);
      await rescheduleAutoHentai(i._client, i.guildID);
      return i.createMessage({ embeds: [{ color: 0xcdb4db, description: 'Automation disabled.' }], flags: 64 });
    }
  } catch (error) {
    console.error('Error handling component interaction:', error);
  }
}
