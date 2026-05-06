const jwt = require("jsonwebtoken");
const User = require("../../models/auth/user.model");

const optionalAuthMiddleware = async (req, _res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_LOGGED_TRACK_SECRET_KEY);

    if (!decoded?.id) {
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      req.user = user;
    }

    return next();
  } catch (_error) {
    return next();
  }
};

module.exports = optionalAuthMiddleware;
