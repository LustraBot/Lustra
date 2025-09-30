import dotenv from 'dotenv';

dotenv.config();

const errorChannelId = process.env.errorchannelid;

export async function sendErrorToChannel(client, error, context = {}) {
  try {
    if (!errorChannelId) {
      console.error('[ErrorHandler] No error channel ID configured');
      return;
    }

    let errorChannel = null;
    
    for (const [, guild] of client.guilds) {
      const channel = guild.channels.get(errorChannelId);
      if (channel) {
        errorChannel = channel;
        break;
      }
    }

    if (!errorChannel) {
      console.error('[ErrorHandler] Error channel not found:', errorChannelId);
      return;
    }

    const errorMessage = error?.stack || error?.message || String(error);
    const truncatedError = errorMessage.length > 1024 
      ? errorMessage.substring(0, 1021) + '...'
      : errorMessage;

    const fields = [
      {
        name: 'Error Details',
        value: `\`\`\`\n${truncatedError}\n\`\`\``,
        inline: false,
      },
    ];

    if (context.guildId) {
      fields.push({
        name: 'Guild ID',
        value: context.guildId,
        inline: true,
      });
    }

    if (context.channelId) {
      fields.push({
        name: 'Channel ID',
        value: context.channelId,
        inline: true,
      });
    }

    if (context.command) {
      fields.push({
        name: 'Command',
        value: context.command,
        inline: true,
      });
    }

    if (context.userId) {
      fields.push({
        name: 'User ID',
        value: context.userId,
        inline: true,
      });
    }

    if (context.source) {
      fields.push({
        name: 'Source',
        value: context.source,
        inline: true,
      });
    }

    await errorChannel.createMessage({
      embeds: [
        {
          description: context.description || 'An error occurred in the bot.',
          fields: fields,
          color: 0xcdb4db,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    console.error('[ErrorHandler] Error sent to channel:', error?.message || error);
  } catch (err) {
    console.error('[ErrorHandler] Failed to send error to channel:', err?.message || err);
  }
}