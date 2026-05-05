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
  "status",
  "gender",
  "dob",
];

const ownerVisibleFields = [...basePublicFields, ...visibilityControlledFields, "profileVisibility"];

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

  if (isOwner) {
    const ownerUser = pickAllowedFields(userObject, ownerVisibleFields);
    ownerUser.friendsCount = friendsCount;
    ownerUser.followersCount = followersCount;
    ownerUser.followingCount = followingCount;
    return ownerUser;
  }

  const publicUser = pickAllowedFields(userObject, basePublicFields);
  const visibility = userObject.profileVisibility || {};
  publicUser.friendsCount = friendsCount;

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

  return publicUser;
};

module.exports = toPublicUser;
