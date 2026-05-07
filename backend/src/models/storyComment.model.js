const mongoose = require("mongoose");

const storyCommentSchema = new mongoose.Schema(
  {
    storyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storyHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
  },
  {
    timestamps: true,
  },
);

storyCommentSchema.index({ storyOwner: 1, storyHistoryId: 1, createdAt: -1 });

module.exports = mongoose.model("StoryComment", storyCommentSchema);
