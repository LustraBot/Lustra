import fetch from "node-fetch";

export default {
    name: "hentai",
    description: "Hentai!",
    execute: async (interaction) => {
        if (!interaction.channel.nsfw)
            return interaction.createMessage("NSFW only.");

        const res = await fetch("https://api.waifu.pics/nsfw/waifu");
        const data = await res.json();
        let embed = {
            image: {
                url: data.url
            },
            color: 0xcdb4db
        };
        await interaction.createMessage({ embed: embed });
    }
};