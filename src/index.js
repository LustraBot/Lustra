import Eris, { Constants, Collection, CommandInteraction } from 'eris';
import fs from 'fs';
import console from 'consola';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { connectDB } from './db.js';
import { initAutoHentai } from './automation/hentaiAuto.js';
import { handleComponentInteraction } from './handlers/components.js';
import { sendErrorToChannel } from './handlers/errors.js';
import { trackCommandUsage } from './handlers/profile.js';

dotenv.config();

// Validate Discord token format
function validateDiscordToken(token) {
    if (!token) {
        console.error('[Client] Discord token not found in environment variables');
        return false;
    }
    
    // Discord bot tokens should be around 70 characters and contain exactly one dot
    if (token.length < 50 || token.length > 80) {
        console.warn('[Client] Discord token length seems unusual:', token.length, 'characters');
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
        console.error('[Client] Discord token format appears invalid (should have 3 parts)');
        return false;
    }
    
    return true;
}

if (!validateDiscordToken(process.env.DISCORD_TOKEN)) {
    console.error('[Client] Invalid Discord token configuration');
    process.exit(1);
}

export const botStartTime = Date.now();

// Add connection monitoring
let connectionHealthCheck = null;
let lastHeartbeat = Date.now();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

connectDB().catch(err => {
  console.error('[DB] MongoDB connection failed at boot:', err);
});

const client = new Eris(`${process.env.DISCORD_TOKEN}`, {
    intents: [
        Constants.Intents.guilds,
        Constants.Intents.guildMessages,
    ],
    // Add connection configuration for better stability
    autoreconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 5000, // 5 seconds
    defaultImageFormat: 'png',
    defaultImageSize: 256,
});

client.on('ready', async () => {
    console.info(`Logged in as ${client.user.username}#${client.user.discriminator}`);
    const clearCmdCache = (process.env.CLEAR_COMMAND_CACHE || '').toLowerCase() === 'true';
    
    // Reset reconnection attempts on successful connection
    reconnectAttempts = 0;
    lastHeartbeat = Date.now();
    console.info('[Client] Connection established, resetting health check counters');

    if (clearCmdCache) {
        try {
            console.info('CLEAR_COMMAND_CACHE=true — clearing global application commands...');
            await client.bulkEditCommands([]);
            console.info('Global application commands cleared.');
        } catch (err) {
            console.error('Failed to clear global application commands:', err);
        }
    }

    console.info('Loading commands...');
    client.commands = new Collection();
    const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = (await import(`./commands/${file}`)).default;
        client.commands.set(command.name, command);

        if (!clearCmdCache) {
            client.createCommand({
                name: command.name,
                description: command.description,
                options: command.options ?? [],
                type: Constants.ApplicationCommandTypes.CHAT_INPUT,
            });
        }
    }

    if (clearCmdCache) {
        console.info('Command registration skipped due to CLEAR_COMMAND_CACHE=true');
    }
    console.info('Commands loaded!');

    await initAutoHentai(client);

    if (process.env.TOPGGTOKEN) {
        updateTopGGStats();
        setInterval(updateTopGGStats, 1800000);
    }

    setTimeout(() => {
        updateStatus();
        setInterval(updateStatus, 6000);
    }, 2000);
});

const mentionRegexCache = new Map();

function stripEphemeralFlags(payload) {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }
    const { flags, ...rest } = payload;
    return rest;
}

function buildMessageProxyInteraction(message, commandName) {
    const respond = async (data) => {
        const payload = stripEphemeralFlags(data);
        return message.channel.createMessage(payload);
    };

    return {
        member: message.member ? { ...message.member, user: message.author } : null,
        user: message.author,
        author: message.author,
        guildID: message.guildID,
        channel: message.channel,
        guild: message.channel.guild,
        data: { name: commandName, options: [] },
        defer: async () => {
            if (typeof message.channel.sendTyping === 'function') {
                try {
                    await message.channel.sendTyping();
                } catch (error) {
                    console.error('[Mentions] Failed to send typing indicator:', error);
                }
            }
        },
        createMessage: respond,
        createFollowup: respond,
        _client: client,
    };
}

client.on('messageCreate', async (message) => {
    if (message.author?.bot) {
        return;
    }

    const content = message.content || '';
    if (!content.length) {
        return;
    }

    let regex = mentionRegexCache.get(client.user.id);
    if (!regex) {
        regex = new RegExp(`^<@!?${client.user.id}>\\s*`, 'i');
        mentionRegexCache.set(client.user.id, regex);
    }

    if (!regex.test(content)) {
        return;
    }

    const remaining = content.replace(regex, '').trim();
    if (!remaining.length) {
        try {
            await message.channel.createMessage({
                content: "Hey! Thanks for using Lustra, we don't have a set prefix so we only use slash commands or @Lustra <query>. For any support run /about and join our support server.",
            });
        } catch (error) {
            console.error('[Mentions] Failed to send mention response:', error);
        }
        return;
    }

    const [commandNameRaw] = remaining.split(/\s+/, 1);
    const commandName = commandNameRaw?.toLowerCase();
    if (!commandName) {
        return;
    }

    const command = client.commands?.get(commandName);
    if (!command) {
        try {
            await message.channel.createMessage({
                content: "Hey! Thanks for using Lustra, we don't have a set prefix so we only use slash commands or @Lustra <query>. For any support run /about and join our support server.",
            });
        } catch (error) {
            console.error('[Mentions] Failed to send mention response:', error);
        }
        return;
    }

    if (command.options?.length) {
        try {
            await message.channel.createMessage({
                content: "That command needs options that only slash commands support. Please try using the `/` version instead!",
            });
        } catch (error) {
            console.error('[Mentions] Failed to send slash-required response:', error);
        }
        return;
    }

    try {
        const proxyInteraction = buildMessageProxyInteraction(message, commandName);
        await command.execute(proxyInteraction);
        await trackCommandUsage(proxyInteraction);
    } catch (error) {
        console.error('[Mentions] Failed to proxy command execution:', error);
        try {
            await message.channel.createMessage({
                content: "I couldn't run that command here. Please try the slash command instead.",
            });
        } catch (sendError) {
            console.error('[Mentions] Failed to send fallback error response:', sendError);
        }
    }
});

async function sendWelcomeMessage(member) {
    const welcomeChannelId = "1421959685921050755";
    const verifyChannelId = "1421932309946568715";
    const updatesChannelId = "1421934523230195743";
    const githubChannelId = "1421934554846855401";

    const welcomeChannel = member.guild.channels.get(welcomeChannelId);
    if (!welcomeChannel) {
        console.warn(`Welcome channel ${welcomeChannelId} not found in guild ${member.guild.id}`);
        return;
    }

    const embed = {
        title: "<:welcome:1421961081798266911> Welcome to Lustra!",
        color: 0xcdb4db,
        description: "We're happy to have you here! Lustra is a Discord bot designed for quick access to NSFW content with efficient delivery.",
        fields: [
            {
                name: "<:bowandarrow:1421961111187624007> Next Steps",
                value: "Please press the \"Verify Here\" button below to verify",
                inline: false,
            },
            {
                name: "<:lightning:1421961099871391776> Quick Features",
                value: "• Fast image & gif delivery\n• Smart rate limiting\n• NSFW channel detection\n• Multiple content sources",
                inline: false,
            },
            {
                name: "<:link:1421961090442461214> Need Help?",
                value: "Use `/help` to see all available commands",
                inline: false,
            },
        ],
        footer: {
            text: "Enjoy your stay! • Made with ❤️",
        },
        timestamp: new Date().toISOString(),
    };

    const components = [
        {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 5,
                    label: "Verify Here",
                    url: `https://discord.com/channels/${member.guild.id}/${verifyChannelId}`
                },
                {
                    type: 2,
                    style: 5,
                    label: "Updates",
                    url: `https://discord.com/channels/${member.guild.id}/${updatesChannelId}`
                },
                {
                    type: 2,
                    style: 5,
                    label: "GitHub",
                    url: `https://discord.com/channels/${member.guild.id}/${githubChannelId}`
                }
            ]
        }
    ];

    try {
        await welcomeChannel.createMessage({
            content: `<@${member.id}>`,
            embeds: [embed],
            components: components
        });
        console.info(`Sent welcome message to ${member.username}#${member.discriminator}`);
    } catch (error) {
        console.error(`Failed to send welcome message:`, error);
    }
}



 

client.on('interactionCreate', async (i) => {
    if (i instanceof CommandInteraction) {
        if (!client.commands.has(i.data.name)) return i.createMessage('This command does not exist.');

        try {
            await client.commands.get(i.data.name).execute(i);
            await trackCommandUsage(i);
        } catch (error) {
            console.error(error);
            await sendErrorToChannel(client, error, {
                description: 'An error occurred while executing a command.',
                source: 'Command Execution',
                command: i.data.name,
                guildId: i.guildID,
                channelId: i.channel?.id,
                userId: i.member?.user?.id || i.user?.id,
            });
            await i.createMessage('There was an error while executing this command!');
        }
        return;
    }
    await handleComponentInteraction(i);
});

client.on('guildCreate', () => {
    if (process.env.TOPGGTOKEN) {
        updateTopGGStats();
    }
});

client.on('guildDelete', () => {
    if (process.env.TOPGGTOKEN) {
        updateTopGGStats();
    }
});

async function updateTopGGStats() {
    try {
        const serverCount = client.guilds.size;
        const response = await fetch(`https://top.gg/api/bots/${client.user.id}/stats`, {
            method: 'POST',
            headers: {
                'Authorization': process.env.TOPGGTOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                server_count: serverCount,
            }),
        });

        if (response.ok) {
            console.info(`Posted stats to Top.gg: ${serverCount} servers`);
        } else {
            console.error('Failed to post stats to Top.gg:', response.status);
        }
    } catch (error) {
        console.error('Error posting to Top.gg:', error.message);
    }
}

let currentStatus = 0;

async function updateStatus() {
    try {
        const serverCount = client.guilds.size;
        const memberCount = client.guilds.reduce((total, guild) => total + guild.memberCount, 0);

        const statuses = [
            `/help | ${serverCount} servers`,
            `/about | ${memberCount} members`
        ];

        client.editStatus('online', {
            name: statuses[currentStatus],
            type: 0
        });

        currentStatus = (currentStatus + 1) % statuses.length;
    } catch (error) {
        console.error('Error updating status:', error.message);
    }
}

client.on('error', async (error) => {
    console.error('[Client] Error event:', error);
    await sendErrorToChannel(client, error, {
        description: 'A client error occurred.',
        source: 'Discord Client',
    });
});

client.on('disconnect', (error) => {
    console.warn('[Client] Disconnected from Discord gateway. Error:', error);
    
    // Check for specific error codes
    if (error && error.code) {
        switch (error.code) {
            case 1000:
                console.info('[Client] Normal WebSocket closure, will reconnect automatically');
                break;
            case 4004:
                console.error('[Client] Authentication failed - token is invalid');
                console.error('[Client] Please check your DISCORD_TOKEN environment variable');
                process.exit(1);
                break;
            case 4010:
                console.error('[Client] Invalid shard data provided');
                break;
            case 4011:
                console.error('[Client] Shard would be on too many guilds');
                break;
            case 4012:
                console.error('[Client] Invalid gateway version');
                break;
            case 4013:
                console.error('[Client] Invalid intents specified');
                break;
            case 4014:
                console.error('[Client] Shard was disallowed from connecting (intents issue)');
                break;
            default:
                console.warn(`[Client] Unknown WebSocket error code: ${error.code}`);
        }
    }
    
    // Attempt to reconnect automatically
    if (error && error.code !== 1000) { // 1000 is normal closure
        console.info('[Client] Attempting to reconnect...');
        setTimeout(() => {
            try {
                client.connect();
            } catch (reconnectError) {
                console.error('[Client] Failed to reconnect:', reconnectError);
            }
        }, 5000);
    }
});

client.on('shardDisconnect', (id, err) => {
    console.warn(`[Client] Shard ${id} disconnected:`, err);
    
    // Log shard-specific disconnection
    if (err && err.code !== 1000) {
        console.info(`[Client] Shard ${id} attempting to reconnect...`);
        setTimeout(() => {
            try {
                client.shards.get(id)?.connect();
            } catch (reconnectError) {
                console.error(`[Client] Failed to reconnect shard ${id}:`, reconnectError);
            }
        }, 3000);
    }
});

client.on('shardError', (error, shardID) => {
    console.error(`[Client] Shard ${shardID} error:`, error);
    
    // Log the error but don't await since this isn't an async handler
    sendErrorToChannel(client, error, {
        description: `A shard error occurred on shard ${shardID}.`,
        source: 'Discord Shard',
        shardId: shardID.toString(),
    }).catch(err => {
        console.error('[Client] Failed to send shard error to channel:', err);
    });
});

client.on('shardReady', (shardID) => {
    console.info(`[Client] Shard ${shardID} ready`);
});

client.on('shardResumed', (shardID) => {
    console.info(`[Client] Shard ${shardID} resumed connection`);
});

// Add heartbeat tracking
client.on('shardPreReady', (shardID) => {
    console.info(`[Client] Shard ${shardID} pre-ready, heartbeat tracking active`);
});

client.on('voiceServerUpdate', () => {
    // Update heartbeat on any gateway activity
    lastHeartbeat = Date.now();
});

client.on('guildSync', () => {
    // Update heartbeat on any gateway activity
    lastHeartbeat = Date.now();
});

process.on('uncaughtException', async (error) => {
    console.error('[Process] Uncaught Exception:', error);
    if (client.ready) {
        await sendErrorToChannel(client, error, {
            description: 'An uncaught exception occurred.',
            source: 'Process Exception',
        });
    }
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
    if (client.ready) {
        await sendErrorToChannel(client, reason, {
            description: 'An unhandled promise rejection occurred.',
            source: 'Promise Rejection',
        });
    }
});

// Add process exit handlers for graceful shutdown
process.on('SIGINT', () => {
    console.info('[Process] Received SIGINT, shutting down gracefully...');
    if (connectionHealthCheck) {
        clearInterval(connectionHealthCheck);
    }
    client.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.info('[Process] Received SIGTERM, shutting down gracefully...');
    if (connectionHealthCheck) {
        clearInterval(connectionHealthCheck);
    }
    client.disconnect();
    process.exit(0);
});

// Add emergency connection recovery
setInterval(() => {
    if (!client.ready && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.warn('[Client] Bot not ready, attempting emergency recovery...');
        try {
            client.connect();
            reconnectAttempts++;
        } catch (error) {
            console.error('[Client] Emergency recovery failed:', error);
        }
    }
}, 60000); // Check every minute

client.connect();

// Add connection health monitoring
function startConnectionHealthCheck() {
    // Check connection health every 30 seconds
    connectionHealthCheck = setInterval(() => {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - lastHeartbeat;
        
        // If we haven't received a heartbeat in 90 seconds, we might be disconnected
        if (timeSinceLastHeartbeat > 90000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.warn('[Client] No heartbeat received for 90 seconds. Attempting reconnection...');
            
            try {
                // Check if still connected
                if (!client.shards?.get(0)?.connected) {
                    console.info('[Client] Connection appears dead. Attempting to reconnect...');
                    client.connect();
                    reconnectAttempts++;
                    
                    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                        console.error('[Client] Maximum reconnection attempts reached. Manual intervention required.');
                        clearInterval(connectionHealthCheck);
                    }
                }
            } catch (error) {
                console.error('[Client] Health check reconnection failed:', error);
            }
        }
    }, 30000);
}

// Start health check after initial connection
setTimeout(startConnectionHealthCheck, 10000);

