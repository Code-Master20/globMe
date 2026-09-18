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

// READING THIS ONE FOR toPublicUser
// const relationshipCounts = buildRelationshipCounts(userObject);
const buildRelationshipCounts = (userDoc) => {
  // accessing friends field in user document and extracting all ids of friends from friends field array in user document
  const friendIds = Array.isArray(userDoc?.friends)
    ? userDoc.friends.map((id) => `${id}`)
    : [];
  // accessing followers field in user document and extracting all ids of followers from followers field array in user document
  const followerIds = Array.isArray(userDoc?.followers)
    ? userDoc.followers.map((id) => `${id}`)
    : [];
// accessing following field in user document and extracting all ids of following from following field array in user document
  const followingIds = Array.isArray(userDoc?.following)
    ? userDoc.following.map((id) => `${id}`)
    : [];
  
// Set is a built-in JavaScript object designed to store a collection of unique values.
// number = new Set();
// number.add(10);
// number.add(12)
// number.add(10)
// console.log(number)
// output wil be : Set(2) { 10, 12 } cause 10 is already present it is just like set in mamthematics
  const followerIdSet = new Set(followerIds);
  const friendIdSet = new Set(friendIds);
  const followingIdSet = new Set(followingIds);
  // so basically friendIds those present in followerSet extracting then how many extracted evaluating those using .length 
  // and storing count in safrosCount
  const safrosCount = friendIds.filter((id) => followerIdSet.has(id)).length;
  // if a follower not in my friend list keep if present remove that follower
  const sabosCount = followerIds.filter((id) => !friendIdSet.has(id)).length;
  const fradosCount = Math.max(0, friendIds.length - safrosCount);
  const safroingsCount = followingIds.filter((id) =>
    friendIdSet.has(id),
  ).length;
  const saboingsCount = Math.max(0, followingIds.length - safroingsCount);
 
// Finally an object being returned with fields and values
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
  const relationshipStatus = hasRelationship(
    viewer?.friends,
    normalizedTargetId,
  )
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
