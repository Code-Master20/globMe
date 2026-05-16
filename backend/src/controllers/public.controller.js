const Post = require("../models/post.model");
const User = require("../models/auth/user.model");
const { GAME_DEFINITIONS } = require("./game.controller");

const getSiteBaseUrl = () => {
  const configuredBase =
    process.env.FRONTEND_URI ||
    process.env.FRONTEND_URI_LOCAL ||
    process.env.FRONTEND_URL ||
    "https://globme.vercel.app";

  return configuredBase.replace(/\/+$/, "");
};

const formatLastMod = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
};

const buildUrlEntry = (loc, lastmod) => {
  if (!loc) {
    return "";
  }

  if (!lastmod) {
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
  }

  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    "  </url>",
  ].join("\n");
};

const getLatestValue = (items) => {
  const timestamps = items
    .map((item) => {
      const date = new Date(item);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    })
    .filter(Boolean);

  if (!timestamps.length) {
    return "";
  }

  return formatLastMod(new Date(Math.max(...timestamps)));
};

const addSitemapEntry = (entryMap, loc, lastmod = "") => {
  if (!loc) {
    return;
  }

  if (!entryMap.has(loc)) {
    entryMap.set(loc, lastmod || "");
    return;
  }

  if (!entryMap.get(loc) && lastmod) {
    entryMap.set(loc, lastmod);
  }
};

const getDynamicSitemap = async (_req, res) => {
  try {
    const baseUrl = getSiteBaseUrl();

    const [users, posts] = await Promise.all([
      User.find({})
        .select("_id updatedAt")
        .sort({ updatedAt: -1 })
        .lean(),
      Post.find({})
        .select("_id user postType updatedAt")
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const entryMap = new Map();
    const validUserIds = new Set(users.map((user) => `${user._id}`));
    const publicPosts = posts.filter((post) => validUserIds.has(`${post.user}`));
    const availableGames = GAME_DEFINITIONS.filter((game) => game.status === "available");
    const latestPublicPostLastMod = getLatestValue(publicPosts.map((post) => post.updatedAt));
    const latestVideoPostLastMod = getLatestValue(
      publicPosts
        .filter((post) => post.postType === "video")
        .map((post) => post.updatedAt),
    );
    const latestImagePostLastMod = getLatestValue(
      publicPosts
        .filter((post) => post.postType === "image")
        .map((post) => post.updatedAt),
    );
    const latestTextPostLastMod = getLatestValue(
      publicPosts
        .filter((post) => post.postType === "text")
        .map((post) => post.updatedAt),
    );

    [
      ["/", latestPublicPostLastMod],
      ["/video-feed", latestVideoPostLastMod],
      ["/photo-feed", latestImagePostLastMod],
      ["/post-feed", latestTextPostLastMod],
    ].forEach(([path, lastmod]) => {
      addSitemapEntry(entryMap, `${baseUrl}${path}`, lastmod);
    });

    availableGames.forEach((game) => {
      addSitemapEntry(entryMap, `${baseUrl}/games/${game.key}`);
    });

    users.forEach((user) => {
      addSitemapEntry(
        entryMap,
        `${baseUrl}/profile/${user._id}`,
        formatLastMod(user.updatedAt),
      );
    });

    publicPosts.forEach((post) => {
      addSitemapEntry(
        entryMap,
        `${baseUrl}/posts/${post._id}`,
        formatLastMod(post.updatedAt),
      );
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...Array.from(entryMap.entries()).map(([loc, lastmod]) =>
        buildUrlEntry(loc, lastmod),
      ),
      "</urlset>",
    ].join("\n");

    res.set("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).send("Dynamic sitemap could not be generated");
  }
};

module.exports = {
  getDynamicSitemap,
};
