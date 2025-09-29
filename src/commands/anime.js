import fetch from "node-fetch";

const cooldowns = new Map();

export default {
  name: "anime",
  description: "cute anime images/gifs!",
  options: [
    {
      name: "type",
      description: "what type of anime content",
      type: 3,
      required: true,
      choices: [
        { name: "image", value: "image" },
        { name: "gif", value: "gif" },
      ],
    },
  ],
  execute: async (interaction) => {
    const userId = interaction.member?.user?.id || interaction.user?.id;
    const now = Date.now();
    const cooldownAmount = 3000;

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

    try {
      let urls = [];

      if (type === "image") {
        const endpoints = [
          "https://api.waifu.pics/sfw/waifu",
          "https://api.waifu.pics/sfw/neko",
          "https://api.waifu.pics/sfw/shinobu",
          "https://api.waifu.pics/sfw/megumin",
        ];

        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

        for (let i = 0; i < 3; i++) {
          try {
            const res = await fetch(randomEndpoint);
            if (!res.ok) continue;
            const data = await res.json().catch(() => null);
            if (data?.url) {
              urls.push(data.url);
              break;
            }
          } catch (error) {
            console.error("Error fetching from waifu.pics:", error);
          }
        }
      } else if (type === "gif") {
        const res = await fetch(
          "https://api.waifu.im/search?is_nsfw=false&gif=true&limit=5",
        );

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const images = Array.isArray(data?.images) ? data.images : [];
          urls = images
            .map((img) => img?.url)
            .filter(Boolean)
            .slice(0, 3);
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
                "I couldn't fetch anything right now. Please try again in a moment.",
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

      const BATCH_SIZE = 5;
      const chunks = [];
      for (let i = 0; i < embeds.length; i += BATCH_SIZE) {
        chunks.push(embeds.slice(i, i + BATCH_SIZE));
      }

      if (chunks.length === 0) {
        return interaction.createMessage({
          embeds: [
            {
              title: "No Results",
              description:
                "I couldn't fetch anything right now. Please try again in a moment.",
              color: 0xcdb4db,
            },
          ],
          flags: 64,
        });
      }

      await interaction.createMessage({ embeds: chunks[0] });

      for (let i = 1; i < chunks.length; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        await interaction.createFollowup({ embeds: chunks[i] });
      }
    } catch (err) {
      console.error("anime cmd error:", err);
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
