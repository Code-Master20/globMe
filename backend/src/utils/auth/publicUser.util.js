const toPublicUser = (userDoc) => {
  if (!userDoc) return null;

  const userObject =
    typeof userDoc.toObject === "function"
      ? userDoc.toObject()
      : { ...userDoc };

  const { password, __v, ...publicUser } = userObject;
  return publicUser;
};

module.exports = toPublicUser;
