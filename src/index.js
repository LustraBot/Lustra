import Eris, { Constants, Collection, CommandInteraction } from 'eris';
import fs from 'fs';
import console from 'consola';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const client = new Eris(`${process.env.DISCORD_TOKEN}`, {
    intents: [
        Constants.Intents.guilds,
        Constants.Intents.guildMessages,
        Constants.Intents.guildMessageReactions,
        Constants.Intents.directMessages,
        Constants.Intents.directMessageReactions,
    ],
});

client.on('ready', async () => {
    console.info(`Logged in as ${client.user.username}#${client.user.discriminator}`);
    console.info('Loading commands...');
    client.commands = new Collection();
    const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = (await import(`./commands/${file}`)).default;
        client.commands.set(command.name, command);

        client.createCommand({
            name: command.name,
            description: command.description,
            options: command.options ?? [],
            type: Constants.ApplicationCommandTypes.CHAT_INPUT,
        });
    }

    console.info('Commands loaded!');

    if (process.env.TOPGGTOKEN) {
        updateTopGGStats();
        setInterval(updateTopGGStats, 1800000);
    }

    setTimeout(() => {
        updateStatus();
        setInterval(updateStatus, 8000);
    }, 2000);
});

client.on('interactionCreate', async (i) => {
    if (i instanceof CommandInteraction) {
        if (!client.commands.has(i.data.name)) return i.createMessage('This command does not exist.');

        try {
            await client.commands.get(i.data.name).execute(i);
        }
        catch (error) {
            console.error(error);
            await i.createMessage('There was an error while executing this command!');
        }
    }
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

function updateStatus() {
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

client.connect();
