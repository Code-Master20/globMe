// middlewares/expressMiddleware/otpVerify.middleware.js
const bcrypt = require("bcryptjs");
const EmailOtp = require("../../models/emailOtp.model");
const TemporaryUser = require("../../models/temporaryUser.model");
const User = require("../../models/user.model");
const SuccessHandler = require("../../utils/successHandler.util");
const ErrorHandler = require("../../utils/errorHandler.util");

const otpVerify = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!purpose) {
      return (
        new ErrorHandler(400, "otp purpose is required")
          // .log("otp purpose", "otp purpose is not provided")
          .send(res)
      );
    }

    if (!otp) {
      return new ErrorHandler(400, "otp field empty").send(res);
    }

    const otpRecord = await EmailOtp.findOne({ email, purpose });
    if (!otpRecord) {
      // await EmailOtp.deleteMany({ email, purpose });
      return (
        new ErrorHandler(400, "otp is invalid or expired")
          // .log("Otp disruptured", "otp is expired or invalid")
          .send(res)
      );
    }

    const isValid = await otpRecord.compareOtp(otp);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        await EmailOtp.deleteOne({ _id: otpRecord._id });
        const id = crypto.randomUUID();
        return (
          new ErrorHandler(
            410,
            "Too many invalid attempts. Please request a new OTP.",
            id,
          )
            // .log("invalid otp", "otp is not valid")
            .send(res)
        );
      }

      return (
        new ErrorHandler(400, "Invalid OTP")
          // .log("otp validation", "Invalid Otp is entered")
          .send(res)
      );
    }

    if (purpose === "signup") {
      const user = await TemporaryUser.findOne({ email });
      if (!user) {
        return (
          new ErrorHandler(
            410,
            "Signup session expired. Please try signing up again.",
          )
            // .log("sign up pending", "no sign up is pending")
            .send(res)
        );
      }

      req.user = user;
    }

    if (purpose === "login") {
      const userData = await User.findOne({ email }).select("-password");
      if (!userData) {
        return new ErrorHandler(401, "Invalid login credentials").send(res);
        // .log("log in failed :", "logging failded for server interuption");
      }
      //const userData = await User.findOne({ email }, { password: 0 });
      req.user = userData;
    }

    if (purpose === "reset-password") {
      const tempUser = await TemporaryUser.findOne({ email });
      if (!tempUser) {
        return (
          new ErrorHandler(
            410,
            "Password reset session expired. Please request a new OTP.",
          )
            // .log(
            //   "user deleted",
            //   "user already deleted from TemporaryUser.schema before the password reset process completd",
            // )
            .send(res)
        );
      }

      const userFound = await User.findOne({ email: tempUser.email });
      if (!userFound) {
        return (
          new ErrorHandler(404, "Account not found")
            // .log(
            //   "account not found :",
            //   "account not fount due to some internal error",
            // )
            .send(res)
        );
      }

      userFound.password = tempUser.password;
      await userFound.save();
      const userData = await User.findOne({ email }).select("-password");
      await TemporaryUser.deleteMany({ email });
      req.user = userData;
    }

    await EmailOtp.deleteMany({ email, purpose });

    next();
  } catch (error) {
    return (
      new ErrorHandler(500, "internal server error")
        // .log("otp verification failed", error)
        .send(res)
    );
  }
};

module.exports = otpVerify;
