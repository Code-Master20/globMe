const { buildRelationshipCounts } = require("../network/relationship.util");

const basePublicFields = [
  "_id",
  "username",
  "avatar",
  "banner",
  "creator",
  "createdAt",
  "updatedAt",
];

const visibilityControlledFields = [
  "email",
  "profession",
  "bio",
  "location",
  "talent",
  "externalLinks",
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
    storyAudioType: userObject.storyAudioType || null,
    storyAudioStartSeconds: Number(userObject.storyAudioStartSeconds) || 0,
    storyAudioEndSeconds: Number(userObject.storyAudioEndSeconds) || 0,
    storyAudioPlaybackDurationSeconds:
      Number(userObject.storyAudioPlaybackDurationSeconds) || 0,
    storyLikeCount:
      typeof userObject.storyLikeCount === "number" ? userObject.storyLikeCount : 0,
    storyExpiresAt: expiresAt.toISOString(),
  };
};

const isLiveStoryDate = (value) => {
  if (!value) {
    return false;
  }

  const storyDate = new Date(value);

  return !Number.isNaN(storyDate.getTime()) && storyDate.getTime() > Date.now();
};

const getStoryHistoryPayload = (userObject, activeHistoryId = null) => {
  if (!Array.isArray(userObject?.storyHistory)) {
    return [];
  }

  return userObject.storyHistory
    .filter((item) => item?.mediaUrl && isLiveStoryDate(item?.expiresAt))
    .map((item) => {
      const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
      const expiresAt = item?.expiresAt ? new Date(item.expiresAt) : null;

      return {
        _id: item?._id ? `${item._id}` : "",
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType || "image",
        audioUrl: item.audioUrl || null,
        audioType: item.audioType || null,
        audioStartSeconds: Number(item.audioStartSeconds) || 0,
        audioEndSeconds: Number(item.audioEndSeconds) || 0,
        audioPlaybackDurationSeconds: Number(item.audioPlaybackDurationSeconds) || 0,
        likeCount: typeof item.likeCount === "number" ? item.likeCount : 0,
        createdAt:
          createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toISOString()
            : null,
        expiresAt:
          expiresAt && !Number.isNaN(expiresAt.getTime())
            ? expiresAt.toISOString()
            : null,
        isLive:
          expiresAt && !Number.isNaN(expiresAt.getTime())
            ? expiresAt.getTime() > Date.now()
            : false,
        isActive:
          activeHistoryId && item?._id
            ? `${item._id}` === `${activeHistoryId}`
            : false,
      };
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 12);
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
  const relationshipCounts = buildRelationshipCounts(userObject);
  const activeStory = getActiveStoryPayload(userObject);
  const storyHistory = getStoryHistoryPayload(
    userObject,
    userObject.storyActiveHistoryId,
  );

  if (isOwner) {
    const ownerUser = pickAllowedFields(userObject, ownerVisibleFields);
    Object.assign(ownerUser, relationshipCounts);
    ownerUser.storyHistory = storyHistory;

    if (activeStory) {
      ownerUser.story = activeStory.story;
      ownerUser.storyType = activeStory.storyType;
      ownerUser.storyAudio = activeStory.storyAudio;
      ownerUser.storyAudioType = activeStory.storyAudioType;
      ownerUser.storyAudioStartSeconds = activeStory.storyAudioStartSeconds;
      ownerUser.storyAudioEndSeconds = activeStory.storyAudioEndSeconds;
      ownerUser.storyAudioPlaybackDurationSeconds =
        activeStory.storyAudioPlaybackDurationSeconds;
      ownerUser.storyLikeCount = activeStory.storyLikeCount;
      ownerUser.storyExpiresAt = activeStory.storyExpiresAt;
    }

    return ownerUser;
  }

  const publicUser = pickAllowedFields(userObject, basePublicFields);
  const visibility = userObject.profileVisibility || {};

  if (visibility.friendsCount !== false) {
    publicUser.friendsCount = relationshipCounts.friendsCount;
    publicUser.fradosCount = relationshipCounts.fradosCount;
  }

  visibilityControlledFields.forEach((field) => {
    const visibilityKey = field === "externalLinks" ? "links" : field;

    if (visibility[visibilityKey] !== false && userObject[field] !== undefined) {
      publicUser[field] = userObject[field];
    }
  });

  if (visibility.followingCount === true) {
    publicUser.followingCount = relationshipCounts.followingCount;
    publicUser.saboingsCount = relationshipCounts.saboingsCount;
    publicUser.safroingsCount = relationshipCounts.safroingsCount;
  }

  if (userObject.creator && visibility.followersCount === true) {
    publicUser.followersCount = relationshipCounts.followersCount;
    publicUser.sabosCount = relationshipCounts.sabosCount;
    publicUser.safrosCount = relationshipCounts.safrosCount;
  }

  if (activeStory) {
    publicUser.story = activeStory.story;
    publicUser.storyType = activeStory.storyType;
    publicUser.storyAudio = activeStory.storyAudio;
    publicUser.storyAudioType = activeStory.storyAudioType;
    publicUser.storyAudioStartSeconds = activeStory.storyAudioStartSeconds;
    publicUser.storyAudioEndSeconds = activeStory.storyAudioEndSeconds;
    publicUser.storyAudioPlaybackDurationSeconds =
      activeStory.storyAudioPlaybackDurationSeconds;
    publicUser.storyLikeCount = activeStory.storyLikeCount;
    publicUser.storyExpiresAt = activeStory.storyExpiresAt;
  }

  return publicUser;
};

module.exports = toPublicUser;
