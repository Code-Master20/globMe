const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passwordChangeAttemptSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, //auto delete after expiry
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "PasswordChangeAttempt",
  passwordChangeAttemptSchema,
);
