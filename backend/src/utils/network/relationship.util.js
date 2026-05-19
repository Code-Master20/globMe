const hasRelationship = (list = [], targetId) =>
  Array.isArray(list) && list.some((id) => `${id}` === `${targetId}`);

const addRelationshipIfMissing = (list, targetId) => {
  const normalizedList = Array.isArray(list) ? list : [];

  if (!hasRelationship(normalizedList, targetId)) {
    normalizedList.push(targetId);
  }

  return normalizedList;
};

const removeRelationshipIfPresent = (list, targetId) => {
  const normalizedList = Array.isArray(list) ? list : [];
  return normalizedList.filter((id) => `${id}` !== `${targetId}`);
};

const buildRelationshipCounts = (userDoc) => {
  const friendIds = Array.isArray(userDoc?.friends)
    ? userDoc.friends.map((id) => `${id}`)
    : [];
  const followerIds = Array.isArray(userDoc?.followers)
    ? userDoc.followers.map((id) => `${id}`)
    : [];
  const followingIds = Array.isArray(userDoc?.following)
    ? userDoc.following.map((id) => `${id}`)
    : [];
  const followerIdSet = new Set(followerIds);
  const friendIdSet = new Set(friendIds);
  const followingIdSet = new Set(followingIds);
  const safrosCount = friendIds.filter((id) => followerIdSet.has(id)).length;
  const fradosCount = Math.max(0, friendIds.length - safrosCount);
  const safroingsCount = followingIds.filter((id) => friendIdSet.has(id)).length;
  const saboingsCount = Math.max(0, followingIds.length - safroingsCount);
  const sabosCount = followerIds.filter((id) => !friendIdSet.has(id)).length;

  return {
    friendsCount: friendIds.length,
    followersCount: followerIds.length,
    followingCount: followingIds.length,
    fradosCount,
    safrosCount,
    sabosCount,
    saboingsCount,
    safroingsCount,
  };
};

const getRelationshipSnapshot = (viewer, target) => {
  const targetId = target?._id || target?.id || target;
  const normalizedTargetId = `${targetId ?? ""}`;
  const relationshipStatus = hasRelationship(viewer?.friends, normalizedTargetId)
    ? "friends"
    : hasRelationship(viewer?.friendRequestsSent, normalizedTargetId)
      ? "pending_sent"
      : hasRelationship(viewer?.friendRequestsReceived, normalizedTargetId)
        ? "pending_received"
        : "none";
  const canSubscribe = Boolean(target?.creator);
  const isSubscribed =
    canSubscribe && hasRelationship(viewer?.following, normalizedTargetId);
  const friendType =
    relationshipStatus === "friends"
      ? isSubscribed
        ? "safro"
        : "frado"
      : null;
  const subscriberType = isSubscribed
    ? relationshipStatus === "friends"
      ? "safro"
      : "sabo"
    : null;

  return {
    relationshipStatus,
    friendType,
    subscriberType,
    connectionType: friendType || subscriberType || "none",
    canSubscribe,
    isSubscribed,
  };
};

const buildRelationshipPayload = (viewer, target) => ({
  targetUserId: `${target?._id || ""}`,
  ...getRelationshipSnapshot(viewer, target),
  counts: buildRelationshipCounts(target),
});

module.exports = {
  hasRelationship,
  addRelationshipIfMissing,
  removeRelationshipIfPresent,
  buildRelationshipCounts,
  getRelationshipSnapshot,
  buildRelationshipPayload,
};
