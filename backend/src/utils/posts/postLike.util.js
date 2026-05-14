const mongoose = require("mongoose");
const Like = require("../../models/like.model");

const getViewerLikedPostIdSet = async (viewerId, postIds = []) => {
  const normalizedViewerId = `${viewerId ?? ""}`.trim();

  if (!normalizedViewerId || !mongoose.isValidObjectId(normalizedViewerId)) {
    return new Set();
  }

  const normalizedPostIds = Array.from(
    new Set(
      postIds
        .map((item) => `${item ?? ""}`.trim())
        .filter((item) => mongoose.isValidObjectId(item)),
    ),
  );

  if (!normalizedPostIds.length) {
    return new Set();
  }

  const likes = await Like.find({
    user: normalizedViewerId,
    post: { $in: normalizedPostIds },
  }).select("post");

  return new Set(likes.map((like) => `${like.post}`));
};

module.exports = {
  getViewerLikedPostIdSet,
};
