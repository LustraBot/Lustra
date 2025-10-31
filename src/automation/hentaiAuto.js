  import { getAllAutoHentaiConfigs, updateAutoHentaiLastSent, getAutoHentaiConfig } from '../db.js';
  import { getHentaiUrls } from '../commands/hentai.js';
  import { sendErrorToChannel } from '../handlers/errors.js';

  const timers = new Map();

  function pickType(mode) {
    if (mode === 'both') {
      return Math.random() < 0.5 ? 'image' : 'gif';
    }
    return mode;
  }

  async function sendOne(client, cfg) {
    try {
      const guild = client.guilds.get(cfg.guildId);
      if (!guild) return;
      const channel = guild.channels.get(cfg.channelId);
      if (!channel) return;

      if (!channel.nsfw) return;

      const me = guild.members.get(client.user.id);
      if (!me) return;

      const type = pickType(cfg.mode || 'both');
      const urls = await getHentaiUrls(type, 1);
      if (!urls || !urls.length) return;

      await channel.createMessage({
        embeds: [
          {
            image: { url: urls[0] },
            color: 0xcdb4db,
          },
        ],
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 5,
            label: "Vote for Lustra!",
            url: "https://top.gg/bot/1421884850507354123/vote"
          }]
        }]
      });

      await updateAutoHentaiLastSent(cfg.guildId);
    } catch (err) {
      console.error('[AutoHentai] sendOne error:', err?.message || err);
      stopTimer(cfg.guildId);
      await sendErrorToChannel(client, err, {
        description: 'An error occurred while sending auto hentai. The timer has been stopped.',
        source: 'Auto Hentai',
        guildId: cfg.guildId,
        channelId: cfg.channelId,
      });
    }
  }

  function startTimer(client, cfg) {
    stopTimer(cfg.guildId);
    if (!cfg?.enabled) return;
    const interval = Math.max(5 * 60 * 1000, Number(cfg.intervalMs) || 30 * 60 * 1000);
    const t = setInterval(() => sendOne(client, cfg), interval);
    timers.set(cfg.guildId, t);
  }

  function stopTimer(guildId) {
    const t = timers.get(guildId);
    if (t) {
      clearInterval(t);
      timers.delete(guildId);
    }
  }

  export async function initAutoHentai(client) {
    try {
      const all = await getAllAutoHentaiConfigs();
      for (const cfg of all) {
        startTimer(client, cfg);
      }
      console.info(`[AutoHentai] initialized for ${all.length} guild(s)`);
    } catch (e) {
      console.error('[AutoHentai] init error:', e?.message || e);
      await sendErrorToChannel(client, e, {
        description: 'Failed to initialize auto hentai system.',
        source: 'Auto Hentai Init',
      });
    }
  }

  export async function rescheduleAutoHentai(client, guildId) {
    try {
      const cfg = await getAutoHentaiConfig(guildId);
      if (!cfg || !cfg.enabled) {
        stopTimer(guildId);
        return;
      }
      startTimer(client, cfg);
    } catch (e) {
      console.error('[AutoHentai] reschedule error:', e?.message || e);
      await sendErrorToChannel(client, e, {
        description: 'Failed to reschedule auto hentai.',
        source: 'Auto Hentai Reschedule',
        guildId,
      });
    }
  }

  export function stopAutoHentai(guildId) {
    stopTimer(guildId);
  }
