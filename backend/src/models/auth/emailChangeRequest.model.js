const mongoose = require("mongoose");

const emailChangeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    newEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 15 * 60 * 1000,
    },
  },
  { timestamps: true },
);

emailChangeRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("EmailChangeRequest", emailChangeRequestSchema);
