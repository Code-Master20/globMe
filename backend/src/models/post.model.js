const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      lowercase: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    postType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    contentFormat: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ NEW FIELD
    cloudinaryId: {
      type: String,
      required: true,
    },

    likeCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postDate: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Post", postSchema);
