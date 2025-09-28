import fetch from "node-fetch";

const cooldowns = new Map();

export default {
  name: "hentai",
  description: "Hentai!",
  options: [
    {
      name: "type",
      description: "what type of hentai",
      type: 3,
      required: true,
      choices: [
        {
          name: "image",
          value: "image",
        },
        {
          name: "gif",
          value: "gif",
        },
      ],
    },
    {
      name: "count",
      description: "how many images/gifs",
      type: 4,
      required: false,
      min_value: 1,
      max_value: 10,
    },
  ],
  execute: async (interaction) => {
    if (!interaction.channel.nsfw)
      return interaction.createMessage("NSFW only.");

    const userId = interaction.member?.user?.id || interaction.user?.id;
    const now = Date.now();
    const cooldownAmount = 5000;

    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId) + cooldownAmount;
      if (now < expirationTime) {
        return interaction.createMessage({
          content: "Try again in 5 second",
          flags: 64,
        });
      }
    }

    cooldowns.set(userId, now);
    setTimeout(() => cooldowns.delete(userId), cooldownAmount);

    const type = interaction.data.options?.find(
      (opt) => opt.name === "type",
    )?.value;
    const count =
      interaction.data.options?.find((opt) => opt.name === "count")?.value || 1;

    let apiUrl;
    if (type === "image") {
      apiUrl = "https://api.waifu.pics/nsfw/waifu";
    } else if (type === "gif") {
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
