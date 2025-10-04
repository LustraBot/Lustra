import fetch from "node-fetch";

export default {
  name: "studios",
  description: "Get information about anime studios",
  options: [
    {
      name: "studio",
      description: "Name of the anime studio",
      type: 3,
      required: true,
    },
  ],

  execute: async (interaction) => {
    const studioName = interaction.data.options?.find(o => o.name === "studio")?.value?.trim();
    if (!studioName) return ephemeralError(interaction, "Please provide a studio name.");

    try {
      const studio =
        (await fetchFromAniList(studioName)) ||
        (await fetchFromJikan(studioName)) ||
        (await fetchFromKitsu(studioName));

      if (!studio) {
        return interaction.createMessage({
          embeds: [{
            title: `${await getEmoji("questionsign")} Studio Not Found`,
            description: `I couldn't find a studio named **${studioName}**.`,
            footer: { text: "Try alternate names (e.g., KyoAni ↔ Kyoto Animation)." },
            color: 0xcdb4db,
          }],
          flags: 64,
        });
      }

      const topLines = studio.topAnime
        .slice(0, 5)
        .map(a => `• ${a.title} (${a.score ?? "N/A"})`)
        .join("\n");

      await interaction.createMessage({
        embeds: [{
          title: studio.name,
          url: studio.url || undefined,
          color: 0xcdb4db,
          fields: [
            { name: `${await getEmoji("info")} Source`, value: studio.source, inline: true },
            { name: `${await getEmoji("info")} ID`, value: String(studio.id), inline: true },
            { name: `${await getEmoji("star")} Top Anime`, value: topLines || "N/A" },
            {
              name: `${await getEmoji("note")} About`,
              value: studio.about || `Found ${studio.topAnime.length} anime credited to this studio/company.`,
            },
          ],
          footer: { text: "Data from AniList / MyAnimeList (via Jikan) / Kitsu" },
        }],
      });
    } catch (err) {
      console.error("Studios command error:", err);
      return ephemeralError(interaction, "Failed to fetch studio information. Please try again.");
    }
  },
};

async function fetchFromAniList(name) {
  const query = `
    query ($search: String!) {
      Studio(search: $search) {
        id
        name
        siteUrl
        isAnimationStudio
        favourites
        media(sort: SCORE_DESC, type: ANIME, perPage: 10) {
          nodes {
            title { romaji english }
            averageScore
            siteUrl
          }
        }
      }
    }
  `;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: name } }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const s = json?.data?.Studio;
  if (!s) return null;

  return {
    source: "AniList",
    id: s.id,
    name: s.name,
    url: s.siteUrl,
    about: s.isAnimationStudio ? "Animation studio" : "Company",
    topAnime: (s.media?.nodes || []).map(n => ({
      title: n.title?.english || n.title?.romaji,
      score: n.averageScore ? Math.round(n.averageScore) / 10 * 10 : null,
      url: n.siteUrl,
    })),
  };
}

async function fetchFromJikan(name) {
  const url = new URL("https://api.jikan.moe/v4/producers");
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("query", name);

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const hit = json?.data?.[0];
  if (!hit) return null;

  const listRes = await fetch(
    `https://api.jikan.moe/v4/anime?producers=${hit.mal_id}&order_by=score&sort=desc&limit=10`
  );
  const listJson = listRes.ok ? await listRes.json() : { data: [] };

  return {
    source: "MAL (via Jikan)",
    id: hit.mal_id,
    name: hit.titles?.find(t => t.type === "Default")?.title || hit.titles?.[0]?.title || hit.name || name,
    url: hit.url,
    about: hit.titles?.length ? `Known aliases: ${hit.titles.map(t => t.title).slice(0, 3).join(", ")}` : undefined,
    topAnime: (listJson.data || []).map(a => ({
      title: a.title,
      score: a.score ?? null,
      url: a.url,
    })),
  };
}

async function fetchFromKitsu(name) {
  const producersUrl = new URL("https://kitsu.io/api/edge/producers");
  producersUrl.searchParams.set("filter[name]", name);
  producersUrl.searchParams.set("page[limit]", "1");

  const res = await fetch(producersUrl);
  if (!res.ok) return null;
  const json = await res.json();
  const prod = json?.data?.[0];
  if (!prod) return null;

  const apUrl = new URL("https://kitsu.io/api/edge/anime-productions");
  apUrl.searchParams.set("filter[producerId]", prod.id);
  apUrl.searchParams.set("include", "anime");
  apUrl.searchParams.set("page[limit]", "20");

  const apRes = await fetch(apUrl);
  const apJson = apRes.ok ? await apRes.json() : { included: [] };

  const topAnime = (apJson.included || [])
    .filter(x => x.type === "anime")
    .slice(0, 10)
    .map(a => ({ title: a.attributes?.canonicalTitle, score: null, url: `https://kitsu.io/anime/${a.id}` }));

  return {
    source: "Kitsu",
    id: prod.id,
    name: prod.attributes?.name || name,
    url: `https://kitsu.io/producers/${prod.id}`,
    about: prod.attributes?.description || undefined,
    topAnime,
  };
}

async function ephemeralError(interaction, msg) {
  return interaction.createMessage({
    embeds: [{ title: "❗ Error", description: msg, color: 0xcdb4db }],
    flags: 64,
  });
}

async function getEmoji(emojiName) {
  const emojiMap = {
    dot: '<:dot:1422607586867281970>',
    hug: '<:hug:1422270833455403115>',
    bownarrow: '<:bownarrow:1421961111187624007>',
    welcome: '<:welcome:1421961099871391776>',
    lightning: '<:lightning:1421961090442461214>',
    link: '<:link:1421961081798266911>',
    heart: '<:heart:1421961074751569960>',
    plus18movie: '<:plus18movie:1421912864876400770>',
    pingpong: '<:pingpong:1421912856890310726>',
    cogwheelsilhouette: '<:cogwheelsilhouette:1421912845922078900>',
    questionsign: '<:questionsign:1421912836103475250>',
    star2: '<:star2:1421912827018612776>',
    tools: '<:tools:1421910719255023626>',
    version: '<:version:1421910629970743316>',
    info: '<:info:1421910347564187799>',
    note: '<:note:1421910167775084646>',
    star: '<:star:1421909899721445456>',
  };
  return emojiMap[emojiName] || "❓";
}
