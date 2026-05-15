const toPublicUser = require("../auth/publicUser.util");

const getTimestampValue = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortThreadLevel = (items, ownerId) =>
  [...items].sort((left, right) => {
    const leftOwner = `${left.user?._id || ""}` === `${ownerId || ""}`;
    const rightOwner = `${right.user?._id || ""}` === `${ownerId || ""}`;

    if (leftOwner !== rightOwner) {
      return leftOwner ? -1 : 1;
    }

    return getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt);
  });

const buildCommentThreadPayload = (commentDocs, options = {}) => {
  const {
    viewerId = null,
    ownerId = null,
    likedCommentIdSet = new Set(),
    dislikedCommentIdSet = new Set(),
  } = options;
  const rootComments = [];
  const commentNodeMap = new Map();

  commentDocs
    .filter((item) => item?.user)
    .forEach((commentDoc) => {
      const comment =
        typeof commentDoc.toObject === "function" ? commentDoc.toObject() : commentDoc;

      commentNodeMap.set(`${comment._id}`, {
        _id: `${comment._id}`,
        postId: `${comment.post}`,
        parentCommentId: comment.parentComment ? `${comment.parentComment}` : null,
        comment: comment.comment || "",
        imageUrl: comment.imageUrl || null,
        linkUrl: comment.linkUrl || null,
        likeCount: Number(comment.likeCount) || 0,
        dislikeCount: Number(comment.dislikeCount) || 0,
        likedByViewer: likedCommentIdSet.has(`${comment._id}`),
        dislikedByViewer: dislikedCommentIdSet.has(`${comment._id}`),
        isOwnerComment: `${comment.user?._id || ""}` === `${ownerId || ""}`,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: toPublicUser(comment.user, { viewerId }),
        replies: [],
      });
    });

  commentNodeMap.forEach((commentNode) => {
    if (
      commentNode.parentCommentId &&
      commentNodeMap.has(commentNode.parentCommentId)
    ) {
      commentNodeMap.get(commentNode.parentCommentId).replies.push(commentNode);
      return;
    }

    rootComments.push(commentNode);
  });

  const sortRecursively = (items) =>
    sortThreadLevel(items, ownerId).map((item) => ({
      ...item,
      replies: sortRecursively(item.replies),
    }));

  return sortRecursively(rootComments);
};

module.exports = {
  buildCommentThreadPayload,
};
