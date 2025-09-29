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
    {
      name: "category",
      description: "specific gif category",
      type: 3,
      required: false,
      choices: [
        { name: "hug", value: "hug" },
        { name: "kiss", value: "kiss" },
        { name: "pat", value: "pat" },
        { name: "cuddle", value: "cuddle" },
        { name: "poke", value: "poke" },
        { name: "wave", value: "wave" },
        { name: "wink", value: "wink" },
        { name: "smile", value: "smile" },
        { name: "blush", value: "blush" },
        { name: "smug", value: "smug" },
        { name: "sleep", value: "sleep" },
        { name: "dance", value: "dance" },
        { name: "cry", value: "cry" },
        { name: "laugh", value: "laugh" },
        { name: "bite", value: "bite" },
        { name: "nom", value: "nom" },
        { name: "happy", value: "happy" },
        { name: "baka", value: "baka" },
        { name: "angry", value: "angry" },
        { name: "run", value: "run" },
        { name: "slap", value: "slap" },
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

    const category = interaction.data.options?.find(
      (opt) => opt.name === "category",
    )?.value;

    if (type === "gif" && !category) {
      return interaction.createMessage({
        embeds: [
          {
            title: "Choose a Category!",
            description: "Please specify a gif category using the category option.",
            color: 0xcdb4db,
          },
        ],
        flags: 64,
      });
    }
    try {
      let urls = [];

      let animeName = null;

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
          `https://nekos.best/api/v2/${category}`,
        );

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const results = Array.isArray(data?.results) ? data.results : [];
          urls = results
            .map((result) => result?.url)
            .filter(Boolean)
            .slice(0, 1);

          animeName = results[0]?.anime_name;
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

      const embeds = urls.map((url, index) => {
        const isGif = type === "gif";
        const title = isGif ? (animeName || "Nyah!") : "Kawaii!";
        return {
          title: title,
          image: { url },
          color: 0xcdb4db,
        };
      });

      await interaction.createMessage({ embeds: [embeds[0]] });
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
