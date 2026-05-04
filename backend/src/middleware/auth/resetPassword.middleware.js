const express = require("express");
const User = require("../../models/user.model");
const ErrorHandler = require("../../utils/errorHandler.util");
const TemporaryUser = require("../../models/temporaryUser.model");
const PasswordChangeAttempt = require("../../models/passwordChangeBlocked.model");
const AttemptCount = require("../../models/attemptCount.model");

// ================= RESET WITH OLD PASSWORD =================
async function checkIfBlocked(email, res) {
  const blocked = await PasswordChangeAttempt.findOne({ email });

  if (blocked) {
    const minutesLeft = Math.ceil(
      (blocked.expiresAt - new Date()) / (1000 * 60),
    );

    new ErrorHandler(
      403,
      `Too many attempts. Try again after ${minutesLeft} minutes`,
    ).send(res);

    return true; // stop execution
  }

  return false;
}

async function recordFailedAttempt(email) {
  let attempt = await AttemptCount.findOne({ email });

  if (!attempt) {
    await AttemptCount.create({ email, count: 1 });
    return;
  }

  attempt.count += 1;

  if (attempt.count >= 5) {
    await PasswordChangeAttempt.create({
      email,
      lockUntil: new Date(Date.now() + 30 * 60 * 1000), // 🔥 dynamic
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min block
    });

    attempt.count = 0;
  }

  await attempt.save();
}

async function resetAttempts(email) {
  await AttemptCount.deleteOne({ email });
}

const resetPasswordWithOldPassword = async (req, res, next) => {
  try {
    const { email, password, newPassword } = req.body;

    // 🔒 Step 1: Check if blocked
    const isBlocked = await checkIfBlocked(email, res);
    if (isBlocked) return;

    // 🔍 Step 2: Find user
    const userExisted = await User.findOne({ email });

    // ❌ Step 3: If user not found
    if (!userExisted) {
      await recordFailedAttempt(email);

      return new ErrorHandler(404, "email or password not matched")
        .log("password reset", "email not registered")
        .send(res);
    }

    // 🔑 Step 4: Check old password
    const isMatchOldPassword = await userExisted.comparePassword(password);

    // ❌ Step 5: Wrong password
    if (!isMatchOldPassword) {
      await recordFailedAttempt(email);

      return new ErrorHandler(401, "email or password not matched")
        .log("password mismatch", "user entered wrong old password")
        .send(res);
    }

    // ✅ Step 6: Success → reset attempts
    await resetAttempts(email);

    // 🔥 Step 7: Update password
    userExisted.password = newPassword;
    await userExisted.save();

    // attach user to request
    req.user = {
      id: userExisted._id,
      username: userExisted.username,
      email: userExisted.email,
      creator: userExisted.creator,
    };

    next();
  } catch (error) {
    return new ErrorHandler(500, "internal server error")
      .log("password reset failed", error)
      .send(res);
  }
};

// ================= RESET WITH OTP =================
const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const userExisted = await User.findOne({ email });

    if (!userExisted) {
      return new ErrorHandler(404, "please provide correct email address")
        .log("otp reset", "email not registered")
        .send(res);
    }

    await TemporaryUser.findOneAndUpdate(
      { email },
      {
        username: userExisted.username,
        email,
        password: newPassword,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    req.user = {
      username: userExisted.username,
      email,
      newPassword,
    };

    next();
  } catch (error) {
    return new ErrorHandler(500, error).send(res);
  }
};

module.exports = {
  resetPasswordWithOldPassword,
  resetPasswordWithOtp,
};
