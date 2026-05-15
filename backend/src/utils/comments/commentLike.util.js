const mongoose = require("mongoose");
const CommentLike = require("../../models/commentLike.model");

const getViewerCommentReactionSets = async (viewerId, commentIds = []) => {
  const normalizedViewerId = `${viewerId ?? ""}`.trim();

  if (!normalizedViewerId || !mongoose.isValidObjectId(normalizedViewerId)) {
    return {
      likedCommentIdSet: new Set(),
      dislikedCommentIdSet: new Set(),
    };
  }

  const normalizedCommentIds = Array.from(
    new Set(
      commentIds
        .map((item) => `${item ?? ""}`.trim())
        .filter((item) => mongoose.isValidObjectId(item)),
    ),
  );

  if (!normalizedCommentIds.length) {
    return {
      likedCommentIdSet: new Set(),
      dislikedCommentIdSet: new Set(),
    };
  }

  const likes = await CommentLike.find({
    user: normalizedViewerId,
    comment: { $in: normalizedCommentIds },
  }).select("comment reaction");

  const likedCommentIdSet = new Set();
  const dislikedCommentIdSet = new Set();

  likes.forEach((item) => {
    const reaction = item.reaction === "dislike" ? "dislike" : "like";

    if (reaction === "dislike") {
      dislikedCommentIdSet.add(`${item.comment}`);
      return;
    }

    likedCommentIdSet.add(`${item.comment}`);
  });

  return {
    likedCommentIdSet,
    dislikedCommentIdSet,
  };
};

module.exports = {
  getViewerCommentReactionSets,
};
