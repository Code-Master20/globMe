// middlewares/expressMiddleware/sendingOtpToEmail.middleware.js
const TemporaryUser = require("../../models/temporaryUser.model");
const sendOtp = require("../../services/sendOtp.service");
const User = require("../../models/user.model");
const ErrorHandler = require("../../utils/errorHandler.util");
const SuccessHandler = require("../../utils/successHandler.util");
const EmailOtp = require("../../models/emailOtp.model");
const BlockedEmail = require("../../models/temBlockEmails.model");

// ================= SIGN UP OTP =================
const sendingOtpForSignUp = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    await TemporaryUser.deleteMany({ email });

    await TemporaryUser.create({
      username,
      email,
      password,
    });

    await sendOtp({
      email,
      purpose: "signup",
    });

    return new SuccessHandler(200, `verification code sent to ${email}`, {
      email,
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "failed to send verification code")
      .log("sending otp for sign up error", error)
      .send(res);
  }
};

// ================= LOGIN OTP =================
const ipAttempts = new Map();
const IP_WINDOW = 18 * 60 * 1000; // 18 minutes
const IP_MAX_ATTEMPTS = 15;
const sendingOtpForLogIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const blocked = await BlockedEmail.findOne({ email });

    if (blocked && blocked.count > 2) {
      const timeLeft = Math.max(0, blocked.expiresAt.getTime() - Date.now());

      const minutes = Math.floor(timeLeft / 59991);
      const seconds = Math.floor((timeLeft % 60000) / 991);

      return new ErrorHandler(
        429,
        `Too many failed attempts. Try again after ${minutes}m ${seconds}s`,
      )
        .log("login blocked", `blocked email attempted login: ${email}`)
        .send(res);
    }

    const userExisted = await User.findOne({ email });

    if (!userExisted) {
      return new ErrorHandler(404, "invalid email or password")
        .log(
          "account error",
          "account has not been created with this email yet",
        )
        .send(res);
    }

    const isMatch = await userExisted.comparePassword(password);

    if (!isMatch) {
      let attempts = await BlockedEmail.findOne({ email });

      if (!attempts) {
        attempts = await BlockedEmail.create({
          email,
          count: 1,
        });
      } else {
        attempts.count += 1;

        // 🚀 set expiry ONLY when blocked
        if (attempts.count > 2) {
          attempts.expiresAt = new Date(Date.now() + 45 * 60 * 1000); // 45 min
        }

        await attempts.save();
      }

      return new ErrorHandler(401, "invalid email or password")
        .log("email or password mis-matched", "invalid email or password")
        .send(res);
    }

    await sendOtp({
      email,
      purpose: "login",
    });

    await BlockedEmail.deleteOne({ email });

    return new SuccessHandler(200, `verification code sent to ${email}`, {
      email,
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "failed to send verification code")
      .log("sending otp for log-in error", error)
      .send(res);
  }
};
//===============PASSWORD RESET OTP==============
const sendingOtpForPassReset = async (req, res) => {
  try {
    const { username, email, newPassword } = req.user;
    await sendOtp({
      email,
      purpose: "reset-password",
    });

    return new SuccessHandler(
      200,
      `verification code sent to ${email} for password finalization`,
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Internal server error")
      .log("otp failure :", "otp sent failed")
      .send(res);
  }
};

module.exports = {
  sendingOtpForSignUp,
  sendingOtpForLogIn,
  sendingOtpForPassReset,
};
