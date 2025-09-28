import fetch from "node-fetch";

const cooldowns = new Map();

export default {
  name: "hentai",
  description: "Hentai!",
  options: [
    {
      name: "type",
      description: "what type of hentai",
      type: 1,
      required: true,
      options: [
        {
          name: "image",
          description: "hentai images",
          type: 1,
          options: [
            {
              name: "count",
              description: "how many images",
              type: 4,
              required: false,
              min_value: 1,
              max_value: 10,
            },
          ],
        },
        {
          name: "gif",
          description: "hentai gifs",
          type: 1,
          options: [
            {
              name: "count",
              description: "how many gifs",
              type: 4,
              required: false,
              min_value: 1,
              max_value: 10,
            },
          ],
        },
      ],
    },
  ],
  execute: async (interaction) => {
    if (!interaction.channel.nsfw)
      return interaction.createMessage("NSFW channels only.");

    const userId = interaction.member?.user?.id || interaction.user?.id;
    const now = Date.now();
    const cooldownAmount = 5000;

    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId) + cooldownAmount;
      if (now < expirationTime) {
        return interaction.createMessage({
          content: "Try again in 5 seconds",
          flags: 64,
        });
      }
    }

    cooldowns.set(userId, now);
    setTimeout(() => cooldowns.delete(userId), cooldownAmount);

    const subcommand = interaction.data.options[0].name;
    const count =
      interaction.data.options[0].options?.find((opt) => opt.name === "count")
        ?.value || 1;

    let apiUrl;
    if (subcommand === "image") {
      apiUrl = "https://api.waifu.pics/nsfw/waifu";
    } else if (subcommand === "gif") {
      apiUrl = "https://api.waifu.pics/nsfw/blowjob";
    }

    if (count === 1) {
      const res = await fetch(apiUrl);
      const data = await res.json();
      let embed = {
        image: {
          url: data.url,
        },
        color: 0xcdb4db,
      };
      await interaction.createMessage({ embeds: [embed] });
    } else {
      let embeds = [];
      for (let i = 0; i < count; i++) {
        const res = await fetch(apiUrl);
        const data = await res.json();
        embeds.push({
          image: {
            url: data.url,
          },
          color: 0xcdb4db,
        });
      }

      let messages = [];
      for (let i = 0; i < embeds.length; i += 3) {
        const chunk = embeds.slice(i, i + 3);
        messages.push(chunk);
      }

      await interaction.createMessage({ embeds: messages[0] });
      for (let i = 1; i < messages.length; i++) {
        await interaction.followupMessage({ embeds: messages[i] });
      }
    }
  },
};
