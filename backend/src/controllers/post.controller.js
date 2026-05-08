const Post = require("../models/post.model");
const cloudinary = require("../config/cloudinary.utils");
const SuccessHandler = require("../utils/successHandler.util");
const ErrorHandler = require("../utils/errorHandler.util");
const toPublicUser = require("../utils/auth/publicUser.util");

const getPublicPosts = async (req, res) => {
  try {
    const viewerId = req.user?.id || req.user?._id || null;
    const allowedTypes = ["image", "video", "text"];
    const requestedType = `${req.query.type ?? "all"}`.trim().toLowerCase();
    const limitValue = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitValue)
      ? Math.min(Math.max(limitValue, 1), 48)
      : 24;

    const query =
      requestedType === "all" || !allowedTypes.includes(requestedType)
        ? {}
        : { postType: requestedType };

    const posts = await Post.find(query)
      .populate(
        "user",
        "username avatar banner profession location bio talent status gender dob profileVisibility creator friends followers following createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .limit(limit);

    const normalizedPosts = posts
      .filter((post) => post.user)
      .map((post) => {
        const watchLaterPostIds = Array.isArray(req.user?.watchLaterPosts)
          ? req.user.watchLaterPosts.map((item) => `${item}`)
          : [];

        return {
        _id: post._id,
        title: post.title,
        description: post.description,
        tags: Array.isArray(post.tags) ? post.tags : [],
        postType: post.postType,
        category: post.category || null,
        contentFormat: post.contentFormat || null,
        durationSeconds: Number(post.durationSeconds) || 0,
        url: post.url,
          likeCount: post.likeCount,
          shareCount: post.shareCount,
          commentCount: post.commentCount,
          postDate: post.postDate,
          createdAt: post.createdAt,
          savedToWatchLater: watchLaterPostIds.includes(`${post._id}`),
          user: toPublicUser(post.user, { viewerId }),
        };
      });

    return new SuccessHandler(200, "Public posts", normalizedPosts).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Public posts could not be loaded")
      .log("public posts error", error)
      .send(res);
  }
};

const getPublicPostById = async (req, res) => {
  try {
    const viewerId = req.user?.id || req.user?._id || null;
    const post = await Post.findById(req.params.postId).populate(
      "user",
      "username avatar banner profession location bio talent status gender dob profileVisibility creator friends followers following createdAt updatedAt",
    );

    if (!post || !post.user) {
      return new ErrorHandler(404, "Post not found").send(res);
    }

    return new SuccessHandler(200, "Public post", {
      _id: post._id,
      title: post.title,
      description: post.description,
      tags: Array.isArray(post.tags) ? post.tags : [],
      postType: post.postType,
      category: post.category || null,
      contentFormat: post.contentFormat || null,
      durationSeconds: Number(post.durationSeconds) || 0,
      url: post.url,
      likeCount: post.likeCount,
      shareCount: post.shareCount,
      commentCount: post.commentCount,
      postDate: post.postDate,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      savedToWatchLater: Array.isArray(req.user?.watchLaterPosts)
        ? req.user.watchLaterPosts.some((item) => `${item}` === `${post._id}`)
        : false,
      user: toPublicUser(post.user, { viewerId }),
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Public post could not be loaded")
      .log("public post by id error", error)
      .send(res);
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Optional: check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await cloudinary.uploader.destroy(post.cloudinaryId);

    await post.deleteOne();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

module.exports = { deletePost, getPublicPosts, getPublicPostById };
