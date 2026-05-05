const User = require("../models/user.model");
const SuccessHandler = require("../utils/successHandler.util");
const ErrorHandler = require("../utils/errorHandler.util");
const toPublicUser = require("../utils/publicUser.util");

const logIn = async (req, res, _) => {
  try {
    const { username, email, creator } = req.user;
    const userFound = await User.findOne({ email });
    const token = userFound.generateLogTrackTkn();
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd ? true : false,
      sameSite: isProd ? "none" : "lax", //"none",if frontend is on another domain
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const data = {
      ...toPublicUser(userFound),
      username,
      email,
      creator,
    };
    return new SuccessHandler(200, "log-in successfully done", data).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Internal server error")
      .log("log in failed", error)
      .send(res);
  }
};

module.exports = logIn;
