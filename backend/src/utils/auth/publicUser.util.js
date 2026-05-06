const basePublicFields = [
  "_id",
  "username",
  "avatar",
  "banner",
  "createdAt",
  "updatedAt",
];

const visibilityControlledFields = [
  "email",
  "profession",
  "bio",
  "location",
  "talent",
  "status",
  "gender",
  "dob",
];

const ownerVisibleFields = [
  ...basePublicFields,
  "creator",
  ...visibilityControlledFields,
  "profileVisibility",
];

const getActiveStoryPayload = (userObject) => {
  if (!userObject?.story || !userObject?.storyExpiresAt) {
    return null;
  }

  const expiresAt = new Date(userObject.storyExpiresAt);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    story: userObject.story,
    storyType: userObject.storyType || "image",
    storyAudio: userObject.storyAudio || null,
    storyLikeCount:
      typeof userObject.storyLikeCount === "number" ? userObject.storyLikeCount : 0,
    storyExpiresAt: expiresAt.toISOString(),
  };
};

const pickAllowedFields = (source, allowedFields) =>
  allowedFields.reduce((accumulator, field) => {
    if (source[field] !== undefined) {
      accumulator[field] = source[field];
    }

    return accumulator;
  }, {});

const toPublicUser = (userDoc, options = {}) => {
  if (!userDoc) return null;

  const { viewerId = null } = options;
  const userObject =
    typeof userDoc.toObject === "function"
      ? userDoc.toObject()
      : { ...userDoc };

  const isOwner = viewerId && `${viewerId}` === `${userObject._id}`;
  const friendsCount = Array.isArray(userObject.friends) ? userObject.friends.length : 0;
  const followersCount = Array.isArray(userObject.followers)
    ? userObject.followers.length
    : 0;
  const followingCount = Array.isArray(userObject.following)
    ? userObject.following.length
    : 0;
  const activeStory = getActiveStoryPayload(userObject);

  if (isOwner) {
    const ownerUser = pickAllowedFields(userObject, ownerVisibleFields);
    ownerUser.friendsCount = friendsCount;
    ownerUser.followersCount = followersCount;
    ownerUser.followingCount = followingCount;

    if (activeStory) {
      ownerUser.story = activeStory.story;
      ownerUser.storyType = activeStory.storyType;
      ownerUser.storyAudio = activeStory.storyAudio;
      ownerUser.storyLikeCount = activeStory.storyLikeCount;
      ownerUser.storyExpiresAt = activeStory.storyExpiresAt;
    }

    return ownerUser;
  }

  const publicUser = pickAllowedFields(userObject, basePublicFields);
  const visibility = userObject.profileVisibility || {};

  if (visibility.friendsCount !== false) {
    publicUser.friendsCount = friendsCount;
  }

  visibilityControlledFields.forEach((field) => {
    if (visibility[field] !== false && userObject[field] !== undefined) {
      publicUser[field] = userObject[field];
    }
  });

  if (userObject.creator) {
    if (visibility.followersCount === true) {
      publicUser.followersCount = followersCount;
    }

    if (visibility.followingCount === true) {
      publicUser.followingCount = followingCount;
    }
  }

  if (activeStory) {
    publicUser.story = activeStory.story;
    publicUser.storyType = activeStory.storyType;
    publicUser.storyAudio = activeStory.storyAudio;
    publicUser.storyLikeCount = activeStory.storyLikeCount;
    publicUser.storyExpiresAt = activeStory.storyExpiresAt;
  }

  return publicUser;
};

module.exports = toPublicUser;
