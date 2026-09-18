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
  ...visibilityControlledFields,
  "profileVisibility",
];

// READING THIS ONE---->DONE
const getActiveStoryPayload = (userObject) => {
  if (!userObject?.story || !userObject?.storyExpiresAt) {
    return null;
  }

  // If storyExpiresAt cannot be converted into a valid JavaScript Date,
  // expiresAt.getTime() returns NaN.
  const expiresAt = new Date(userObject.storyExpiresAt);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    story: userObject.story,
    storyType: userObject.storyType || "image",
    storyAudio: userObject.storyAudio || null,
    storyAudioType: userObject.storyAudioType || null, //may be .mp3 .wav .flac .aac .mp4, .ogg
    storyAudioStartSeconds: Number(userObject.storyAudioStartSeconds) || 0,
    storyAudioEndSeconds: Number(userObject.storyAudioEndSeconds) || 0,
    // storyAudioPlaybackDurationSeconds stores the duration for which the selected audio portion should play.
    storyAudioPlaybackDurationSeconds:
      Number(userObject.storyAudioPlaybackDurationSeconds) || 0, //means how long story duration will be
    storyLikeCount:
      typeof userObject.storyLikeCount === "number"
        ? userObject.storyLikeCount
        : 0,
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

// READING THIS ONE--->
// const storyHistory = getStoryHistoryPayload(
//     userObject,
//     userObject.storyActiveHistoryId,
//   );
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
        audioPlaybackDurationSeconds:
          Number(item.audioPlaybackDurationSeconds) || 0,
        likeCount: typeof item.likeCount === "number" ? item.likeCount : 0,
        createdAt:
          createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toISOString()
            : null,
        expiresAt:
          expiresAt && !Number.isNaN(expiresAt.getTime())
            ? expiresAt.toISOString()
            : null,
        // This check if a story is still not expired
        isLive:
          expiresAt && !Number.isNaN(expiresAt.getTime())
            ? expiresAt.getTime() > Date.now()
            : false,
        // This check if a story from storyHistory is currently posted
        isActive:
          activeHistoryId && item?._id
            ? `${item._id}` === `${activeHistoryId}`
            : false,
      };
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt
        ? new Date(right.createdAt).getTime()
        : 0;
      return rightTime - leftTime;
    })
    .slice(0, 12);//This means only returns first 12 items(posted stories) if 12 exceeded
};

const pickAllowedFields = (source, allowedFields) =>
  allowedFields.reduce((accumulator, field) => {
    if (source[field] !== undefined) {
      accumulator[field] = source[field];
    }

    return accumulator;
  }, {});

// toPublicUser(userCreated, { viewerId: userCreated._id }), thiks is how this function is called inside signup controller
const toPublicUser = (userDoc, options = {}) => {
  if (!userDoc) return null;

  // Extract viewerId from the options object. If viewerId is missing or undefined, use null as the default value.
  const { viewerId = null } = options;
  // toObject() is a Mongoose document method. It converts a Mongoose document into a normal JavaScript object.
  // userDoc.toObject is accessing the property of userDoc that is toObject and typeOf is checking if it is a function
  // so typeof userDoc.toObject would print function string
  // is userDoc.toObject a function
  const userObject =
    typeof userDoc.toObject === "function"
      ? userDoc.toObject()
      : { ...userDoc };

  const isOwner = viewerId && `${viewerId}` === `${userObject._id}`;
  // READING THIS ONE
  // here an object is being stored in relationshipCounts that has been returned from buildRelationshipCounts-functions
  //   return {
  //   friendsCount: friendIds.length,
  //   followersCount: followerIds.length,
  //   followingCount: followingIds.length,
  //   fradosCount,
  //   safrosCount,
  //   sabosCount,
  //   saboingsCount,
  //   safroingsCount,
  // };
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

    if (
      visibility[visibilityKey] !== false &&
      userObject[field] !== undefined
    ) {
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
