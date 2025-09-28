import Eris, { Constants, Collection, CommandInteraction } from 'eris';
import fs from 'fs';
import console from 'consola';
import * as dotenv from 'dotenv';


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



client.connect();