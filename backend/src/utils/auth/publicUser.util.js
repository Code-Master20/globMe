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

  if (isOwner) {
    return pickAllowedFields(userObject, ownerVisibleFields);
  }

  const publicUser = pickAllowedFields(userObject, basePublicFields);
  const visibility = userObject.profileVisibility || {};

  visibilityControlledFields.forEach((field) => {
    if (visibility[field] !== false && userObject[field] !== undefined) {
      publicUser[field] = userObject[field];
    }
  });

  return publicUser;
};

module.exports = toPublicUser;
