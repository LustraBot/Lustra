import Eris, { Constants, Collection, CommandInteraction } from 'eris';
import fs from 'fs';
import console from 'consola';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { connectDB } from './db.js';
import { initAutoHentai } from './automation/hentaiAuto.js';
import { handleComponentInteraction } from './handlers/components.js';
import { sendErrorToChannel } from './handlers/errors.js';

dotenv.config();

export const botStartTime = Date.now();

connectDB().catch(err => {
  console.error('[DB] MongoDB connection failed at boot:', err);
});

const client = new Eris(`${process.env.DISCORD_TOKEN}`, {
    intents: [
        Constants.Intents.guilds,
        Constants.Intents.guildMessages,
    ],
});

client.on('ready', async () => {
    console.info(`Logged in as ${client.user.username}#${client.user.discriminator}`);
    const clearCmdCache = (process.env.CLEAR_COMMAND_CACHE || '').toLowerCase() === 'true';

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
                content: "Hey, sorry to catch you like this, but we only support slash commands to avoid using message intents. Please use `/help` to see what's available!",
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
                content: "Hey, sorry to catch you like this, but we only support slash commands to avoid using message intents. Please use `/help` to see what's available!",
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

client.connect();

