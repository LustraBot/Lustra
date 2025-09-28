import fetch from "node-fetch";

const cooldowns = new Map();

export default {
  name: "hentai",
  description: "Hentai!",
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
  execute: async (interaction) => {
    if (!interaction.channel.nsfw)
      return interaction.createMessage("NSFW only.");

    const userId = interaction.user.id;
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

    const count =
      interaction.data.options?.find((opt) => opt.name === "count")?.value || 1;

    if (count === 1) {
      const res = await fetch("https://api.waifu.pics/nsfw/waifu");
      const data = await res.json();
      let embed = {
        image: {
          url: data.url,
        },
        color: 0xcdb4db,
      };
      await interaction.createMessage({ embeds: [embed] });
    } else {
      let images = [];
      for (let i = 0; i < count; i++) {
        const res = await fetch("https://api.waifu.pics/nsfw/waifu");
        const data = await res.json();
        images.push(data.url);
      }

      let messages = [];
      for (let i = 0; i < images.length; i += 3) {
        const chunk = images.slice(i, i + 3);
        messages.push(chunk.join("\n"));
      }

      await interaction.createMessage(messages[0]);
      for (let i = 1; i < messages.length; i++) {
        await interaction.followupMessage(messages[i]);
      }
    }
  },
};
