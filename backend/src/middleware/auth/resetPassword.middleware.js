const User = require("../../models/auth/user.model");
const TemporaryUser = require("../../models/auth/temporaryUser.model");
const PasswordChangeAttempt = require("../../models/auth/passwordChangeBlocked.model");
const AttemptCount = require("../../models/auth/attemptCount.model");
const ErrorHandler = require("../../utils/errorHandler.util");

async function checkIfBlocked(email, res) {
  const blocked = await PasswordChangeAttempt.findOne({ email });

  if (!blocked) {
    return false;
  }

  const minutesLeft = Math.ceil((blocked.expiresAt - new Date()) / (1000 * 60));

  new ErrorHandler(
    403,
    `Too many attempts. Try again after ${minutesLeft} minutes`,
  ).send(res);

  return true;
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
      lockUntil: new Date(Date.now() + 30 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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

    const isBlocked = await checkIfBlocked(email, res);
    if (isBlocked) return;

    const userExisted = await User.findOne({ email });

    if (!userExisted) {
      await recordFailedAttempt(email);
      return new ErrorHandler(404, "email or password not matched")
        .log("password reset", "email not registered")
        .send(res);
    }

    const isMatchOldPassword = await userExisted.comparePassword(password);

    if (!isMatchOldPassword) {
      await recordFailedAttempt(email);
      return new ErrorHandler(401, "email or password not matched")
        .log("password mismatch", "user entered wrong old password")
        .send(res);
    }

    await resetAttempts(email);
    userExisted.password = newPassword;
    await userExisted.save();

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
