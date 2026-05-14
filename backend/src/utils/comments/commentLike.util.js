const mongoose = require("mongoose");
const CommentLike = require("../../models/commentLike.model");

const getViewerLikedCommentIdSet = async (viewerId, commentIds = []) => {
  const normalizedViewerId = `${viewerId ?? ""}`.trim();

  if (!normalizedViewerId || !mongoose.isValidObjectId(normalizedViewerId)) {
    return new Set();
  }

  const normalizedCommentIds = Array.from(
    new Set(
      commentIds
        .map((item) => `${item ?? ""}`.trim())
        .filter((item) => mongoose.isValidObjectId(item)),
    ),
  );

  if (!normalizedCommentIds.length) {
    return new Set();
  }

  const likes = await CommentLike.find({
    user: normalizedViewerId,
    comment: { $in: normalizedCommentIds },
  }).select("comment");

  return new Set(likes.map((item) => `${item.comment}`));
};

module.exports = {
  getViewerLikedCommentIdSet,
};
