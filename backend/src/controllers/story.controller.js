const mongoose = require("mongoose");
const User = require("../models/auth/user.model");
const StoryLike = require("../models/storyLike.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");
const toPublicUser = require("../utils/auth/publicUser.util");

const getActiveStoryQuery = () => ({
  story: { $ne: null },
  storyExpiresAt: { $gt: new Date() },
});

const mapStoryPayload = (userDoc, viewerLiked = false, viewerId = null) => {
  const user = toPublicUser(userDoc, { viewerId });

  if (!user?.story || !user?.storyExpiresAt) {
    return null;
  }

  return {
    user,
    story: {
      mediaUrl: user.story,
      mediaType: user.storyType || "image",
      audioUrl: user.storyAudio || null,
      likeCount: typeof user.storyLikeCount === "number" ? user.storyLikeCount : 0,
      likedByViewer: viewerLiked,
      expiresAt: user.storyExpiresAt,
    },
  };
};

const getPublicStories = async (req, res) => {
  try {
    const viewerId = req.user?.id || req.user?._id || null;
    const activeUsers = await User.find(getActiveStoryQuery())
      .select(
        "username avatar banner profession location bio talent status gender dob profileVisibility creator friends followers following createdAt updatedAt story storyType storyAudio storyLikeCount storyExpiresAt storyCloudinaryId",
      )
      .sort({ storyExpiresAt: 1, updatedAt: -1 })
      .limit(24);

    let likedAssetSet = new Set();

    if (viewerId && activeUsers.length > 0) {
      const storyLikes = await StoryLike.find({
        user: viewerId,
        storyOwner: { $in: activeUsers.map((item) => item._id) },
      }).select("storyOwner storyAsset");

      likedAssetSet = new Set(
        storyLikes.map((item) => `${item.storyOwner}:${item.storyAsset}`),
      );
    }

    const stories = activeUsers
      .map((item) =>
        mapStoryPayload(
          item,
          likedAssetSet.has(`${item._id}:${item.storyCloudinaryId || ""}`),
          viewerId,
        ),
      )
      .filter(Boolean);

    return new SuccessHandler(200, "Public stories", stories).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Stories could not be loaded")
      .log("public stories error", error)
      .send(res);
  }
};

const getPublicStoryByUserId = async (req, res) => {
  try {
    const viewerId = req.user?.id || req.user?._id || null;
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return new ErrorHandler(400, "Invalid story owner").send(res);
    }

    const user = await User.findOne({
      _id: userId,
      ...getActiveStoryQuery(),
    }).select(
      "username avatar banner profession location bio talent status gender dob profileVisibility creator friends followers following createdAt updatedAt story storyType storyAudio storyLikeCount storyExpiresAt storyCloudinaryId",
    );

    if (!user) {
      return new ErrorHandler(404, "Story not found").send(res);
    }

    let likedByViewer = false;

    if (viewerId) {
      const likeDoc = await StoryLike.findOne({
        user: viewerId,
        storyOwner: user._id,
        storyAsset: user.storyCloudinaryId,
      }).select("_id");

      likedByViewer = Boolean(likeDoc);
    }

    return new SuccessHandler(
      200,
      "Public story",
      mapStoryPayload(user, likedByViewer, viewerId),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story could not be loaded")
      .log("public story by user error", error)
      .send(res);
  }
};

const toggleStoryLike = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id || req.user?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return new ErrorHandler(400, "Invalid story owner").send(res);
    }

    if (`${viewerId}` === `${userId}`) {
      return new ErrorHandler(400, "You cannot like your own story").send(res);
    }

    const user = await User.findOne({
      _id: userId,
      ...getActiveStoryQuery(),
    });

    if (!user?.storyCloudinaryId) {
      return new ErrorHandler(404, "Story not found").send(res);
    }

    const existingLike = await StoryLike.findOne({
      user: viewerId,
      storyOwner: user._id,
      storyAsset: user.storyCloudinaryId,
    });

    let liked = false;

    if (existingLike) {
      await existingLike.deleteOne();
      user.storyLikeCount = Math.max(0, (user.storyLikeCount || 0) - 1);
    } else {
      await StoryLike.create({
        user: viewerId,
        storyOwner: user._id,
        storyAsset: user.storyCloudinaryId,
      });
      user.storyLikeCount = (user.storyLikeCount || 0) + 1;
      liked = true;
    }

    await user.save();

    return new SuccessHandler(200, liked ? "Story liked" : "Story unliked", {
      liked,
      likeCount: user.storyLikeCount,
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story like could not be updated")
      .log("story like toggle error", error)
      .send(res);
  }
};

module.exports = {
  getPublicStories,
  getPublicStoryByUserId,
  toggleStoryLike,
};
