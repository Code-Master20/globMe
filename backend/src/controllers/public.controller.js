const Post = require("../models/post.model");
const User = require("../models/auth/user.model");

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

const getDynamicSitemap = async (_req, res) => {
  try {
    const baseUrl = getSiteBaseUrl();

    const [users, posts] = await Promise.all([
      User.find({})
        .select("_id updatedAt")
        .sort({ updatedAt: -1 }),
      Post.find({})
        .select("_id updatedAt")
        .sort({ updatedAt: -1 }),
    ]);

    const profileEntries = users.map((user) =>
      buildUrlEntry(
        `${baseUrl}/profile/${user._id}`,
        formatLastMod(user.updatedAt),
      ),
    );

    const postEntries = posts.map((post) =>
      buildUrlEntry(
        `${baseUrl}/posts/${post._id}`,
        formatLastMod(post.updatedAt),
      ),
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...profileEntries,
      ...postEntries,
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
