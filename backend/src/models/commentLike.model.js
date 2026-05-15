const mongoose = require("mongoose");

const commentLikeSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reaction: {
      type: String,
      enum: ["like", "dislike"],
      default: "like",
    },
  },
  {
    timestamps: true,
  },
);

commentLikeSchema.index({ comment: 1, createdAt: -1 });
commentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CommentLike", commentLikeSchema);
