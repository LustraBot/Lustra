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
        { name: "image", value: "image" },
        { name: "gif", value: "gif" },
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
    if (!interaction.channel?.nsfw) {
      const embed = {
        description:
          "Please use this command in a Age-Restricted channel, thank you!",
        color: 0xcdb4db,
      };
      return interaction.createMessage({ embeds: [embed], flags: 64 });
    }

    const userId = interaction.member?.user?.id || interaction.user?.id;
    const now = Date.now();
    const cooldownAmount = 5000;

    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / 1000);
        const embed = {
          title: "Cooldown Active",
          description: `Please wait ${timeLeft} second${timeLeft !== 1 ? "s" : ""} before using this command again.`,
          color: 0xcdb4db,
        };
        return interaction.createMessage({ embeds: [embed], flags: 64 });
      }
    }
    cooldowns.set(userId, now);
    setTimeout(() => cooldowns.delete(userId), cooldownAmount);

    const type = interaction.data.options?.find(
      (opt) => opt.name === "type",
    )?.value;
    let count = interaction.data.options?.find(
      (opt) => opt.name === "count",
    )?.value;

    count = Number.isFinite(count) ? count : 1;
    if (count < 1) count = 1;
    if (count > 10) count = 10;

    try {
      let urls = [];

      if (type === "image") {
        const endpoint = "https://api.waifu.pics/nsfw/waifu";
        for (let i = 0; i < count; i++) {
          const res = await fetch(endpoint);
          if (!res.ok) continue;
          const data = await res.json().catch(() => null);
          if (data?.url) urls.push(data.url);
        }
      } else if (type === "gif") {
        const res = await fetch(
          `https://api.waifu.im/search?is_nsfw=true&gif=true&limit=${count}`,
        );
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const images = Array.isArray(data?.images) ? data.images : [];
          urls = images
            .map((img) => img?.url)
            .filter(Boolean)
            .slice(0, count);
        }
      } else {
        return interaction.createMessage({
          embeds: [
            {
              title: "Unknown Type",
              description: "Please choose `image` or `gif`.",
              color: 0xcdb4db,
            },
          ],
          flags: 64,
        });
      }

      if (!urls.length) {
        return interaction.createMessage({
          embeds: [
            {
              title: "No Results",
              description:
                "I couldn’t fetch anything right now. Please try again in a moment.",
              color: 0xcdb4db,
            },
          ],
          flags: 64,
        });
      }

      const embeds = urls.map((url) => ({
        image: { url },
        color: 0xcdb4db,
      }));

      const chunks = [];
      for (let i = 0; i < embeds.length; i += 3) {
        chunks.push(embeds.slice(i, i + 3));
      }

      await interaction.createMessage({ embeds: chunks[0] });
      for (let i = 1; i < chunks.length; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await interaction.createFollowup({ embeds: chunks[i] });
      }
    } catch (err) {
      console.error("hentai cmd error:", err);
      return interaction.createMessage({
        embeds: [
          {
            title: "Unexpected Error",
            description:
              "Something went wrong while fetching content. Please try again.",
            color: 0xcdb4db,
          },
        ],
        flags: 64,
      });
    }
  },
};
