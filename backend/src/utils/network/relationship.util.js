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

const buildRelationshipCounts = (userDoc) => ({
  friendsCount: Array.isArray(userDoc?.friends) ? userDoc.friends.length : 0,
  followersCount: Array.isArray(userDoc?.followers) ? userDoc.followers.length : 0,
  followingCount: Array.isArray(userDoc?.following) ? userDoc.following.length : 0,
});

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
