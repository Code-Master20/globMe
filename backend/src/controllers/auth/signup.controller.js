const User = require("../../models/auth/user.model");
const TemporaryUser = require("../../models/auth/temporaryUser.model");
const toPublicUser = require("../../utils/auth/publicUser.util");
const SuccessHandler = require("../../utils/successHandler.util");
const ErrorHandler = require("../../utils/errorHandler.util");

const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.user;

    const userExist = await User.findOne({ email });

    if (userExist) {
      return new ErrorHandler(
        409,
        "You already have an account with this email",
      )
        .log("user pre existed", "user is already registered")
        .send(res);
    }

    const userCreated = await User.create({ username, email, password });
    await TemporaryUser.deleteMany({ email });

    const token = userCreated.generateLogTrackTkn();

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd ? true : false,
      sameSite: isProd ? "none" : "lax", // "lax" if prontend and backend are on same domain you can use "lax" or "strict"
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return new SuccessHandler(
      201,
      "sign-up successfully done",
      toPublicUser(userCreated, { viewerId: userCreated._id }),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "internal server error")
      .log("user not created", error)
      .send(res);
  }
};

module.exports = signUp;
