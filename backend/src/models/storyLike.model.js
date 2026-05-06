const mongoose = require("mongoose");

const storyLikeSchema = new mongoose.Schema(
  {
    storyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storyAsset: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

storyLikeSchema.index({ storyOwner: 1, createdAt: -1 });
storyLikeSchema.index({ storyOwner: 1, storyAsset: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("StoryLike", storyLikeSchema);
