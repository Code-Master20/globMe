const jwt = require("jsonwebtoken");
const User = require("../../models/auth/user.model");
const ErrorHandler = require("../../utils/errorHandler.util");

const isMeMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return new ErrorHandler(401, "Not authenticated").send(res);
    }

    const decoded = jwt.verify(token, process.env.JWT_LOGGED_TRACK_SECRET_KEY);

    if (!decoded?.id) {
      return new ErrorHandler(401, "Malformed token, please log-in again").send(
        res,
      );
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    req.user = user;
    next();
  } catch (error) {
    return new ErrorHandler(
      401,
      "Invalid or expired token, please log-in again",
    ).send(res);
  }
};

module.exports = isMeMiddleware;
