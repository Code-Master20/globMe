const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// This schema tracks which email is blocked ofr login or any further action on website
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
    },
  },
  { timestamps: true },
);

passwordChangeAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model(
  "PasswordChangeAttempt",
  passwordChangeAttemptSchema,
);
