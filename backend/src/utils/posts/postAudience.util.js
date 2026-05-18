const resolvePostAudience = (post) => {
  const normalizedVisibility = `${post?.visibility ?? ""}`.trim().toLowerCase();

  if (["private", "friends", "world", "all"].includes(normalizedVisibility)) {
    return normalizedVisibility;
  }

  return post?.isPublic === false ? "private" : "world";
};

const buildFriendIdSet = (userDoc) =>
  new Set(
    Array.isArray(userDoc?.friends) ? userDoc.friends.map((friendId) => `${friendId}`) : [],
  );

const buildHiddenViewerIdSet = (post) =>
  new Set(
    Array.isArray(post?.hiddenFromUsers)
      ? post.hiddenFromUsers
        .map((userId) => `${userId?._id || userId || ""}`)
        .filter(Boolean)
      : [],
  );

const buildIncludedViewerIdSet = (post) =>
  new Set(
    Array.isArray(post?.visibleToUsers)
      ? post.visibleToUsers
        .map((userId) => `${userId?._id || userId || ""}`)
        .filter(Boolean)
      : [],
  );

const canViewerAccessPostAudience = ({
  post,
  viewerId = null,
  viewerFriendIdSet = new Set(),
}) => {
  const ownerId = `${post?.user?._id || post?.user || ""}`;

  if (viewerId && ownerId && `${viewerId}` === ownerId) {
    return true;
  }

  const hiddenViewerIdSet = buildHiddenViewerIdSet(post);
  const includedViewerIdSet = buildIncludedViewerIdSet(post);

  if (viewerId && hiddenViewerIdSet.has(`${viewerId}`)) {
    return false;
  }

  const visibility = resolvePostAudience(post);

  if (visibility === "private") {
    return viewerId ? includedViewerIdSet.has(`${viewerId}`) : false;
  }

  const viewerIsFriend = ownerId ? viewerFriendIdSet.has(ownerId) : false;

  if (visibility === "friends") {
    return viewerIsFriend;
  }

  if (visibility === "world") {
    return !viewerIsFriend || (viewerId ? includedViewerIdSet.has(`${viewerId}`) : false);
  }

  if (visibility === "all") {
    return true;
  }

  return false;
};

module.exports = {
  resolvePostAudience,
  buildFriendIdSet,
  buildHiddenViewerIdSet,
  canViewerAccessPostAudience,
};
