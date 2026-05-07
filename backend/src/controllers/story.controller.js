const mongoose = require("mongoose");
const User = require("../models/auth/user.model");
const StoryLike = require("../models/storyLike.model");
const StoryComment = require("../models/storyComment.model");
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
      storyEntryId: userDoc.storyActiveHistoryId ? `${userDoc.storyActiveHistoryId}` : "",
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
        "username avatar banner profession location bio talent status gender dob profileVisibility creator friends followers following createdAt updatedAt story storyType storyAudio storyLikeCount storyExpiresAt storyCloudinaryId storyActiveHistoryId",
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

const getStoryHistoryEntry = (user, storyEntryId) => {
  if (!Array.isArray(user?.storyHistory)) {
    return null;
  }

  return user.storyHistory.find((item) => `${item?._id}` === `${storyEntryId}`) || null;
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
      "username avatar banner profession location bio talent status gender dob profileVisibility creator friends followers following createdAt updatedAt story storyType storyAudio storyLikeCount storyExpiresAt storyCloudinaryId storyActiveHistoryId",
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

const addStoryComment = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id || req.user?._id;
    const commentText = `${req.body?.comment ?? ""}`.trim();
    const storyEntryId = `${req.body?.storyEntryId ?? ""}`.trim();

    if (!mongoose.isValidObjectId(userId)) {
      return new ErrorHandler(400, "Invalid story owner").send(res);
    }

    if (!storyEntryId || !mongoose.isValidObjectId(storyEntryId)) {
      return new ErrorHandler(400, "Invalid story selected").send(res);
    }

    if (!commentText) {
      return new ErrorHandler(400, "Comment cannot be empty").send(res);
    }

    if (`${viewerId}` === `${userId}`) {
      return new ErrorHandler(400, "You cannot comment on your own story here").send(res);
    }

    const owner = await User.findById(userId).select(
      "friends storyHistory storyActiveHistoryId story storyExpiresAt",
    );

    if (!owner) {
      return new ErrorHandler(404, "Story owner not found").send(res);
    }

    const isFriend = Array.isArray(owner.friends)
      ? owner.friends.some((friendId) => `${friendId}` === `${viewerId}`)
      : false;

    if (!isFriend) {
      return new ErrorHandler(403, "Only friends can comment on this story").send(res);
    }

    const storyEntry = getStoryHistoryEntry(owner, storyEntryId);

    if (!storyEntry) {
      return new ErrorHandler(404, "Story was not found").send(res);
    }

    const expiresAt = storyEntry?.expiresAt ? new Date(storyEntry.expiresAt) : null;

    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return new ErrorHandler(400, "This story is no longer accepting comments").send(res);
    }

    const commentDoc = await StoryComment.create({
      storyOwner: owner._id,
      storyHistoryId: storyEntry._id,
      user: viewerId,
      comment: commentText,
    });

    const populatedComment = await StoryComment.findById(commentDoc._id).populate(
      "user",
      "username avatar profession",
    );

    return new SuccessHandler(201, "Story comment added", populatedComment).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story comment could not be added")
      .log("story comment create error", error)
      .send(res);
  }
};

const getOwnerStoryComments = async (req, res) => {
  try {
    const viewerId = req.user?.id || req.user?._id;
    const { storyHistoryId } = req.params;

    if (!mongoose.isValidObjectId(storyHistoryId)) {
      return new ErrorHandler(400, "Invalid story selected").send(res);
    }

    const owner = await User.findById(viewerId).select("storyHistory");

    if (!owner) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const storyEntry = getStoryHistoryEntry(owner, storyHistoryId);

    if (!storyEntry) {
      return new ErrorHandler(404, "Story was not found").send(res);
    }

    const comments = await StoryComment.find({
      storyOwner: viewerId,
      storyHistoryId,
    })
      .populate("user", "username avatar profession")
      .sort({ createdAt: -1 })
      .lean();

    return new SuccessHandler(200, "Private story comments", comments).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story comments could not be loaded")
      .log("story comment list error", error)
      .send(res);
  }
};

module.exports = {
  getPublicStories,
  getPublicStoryByUserId,
  toggleStoryLike,
  addStoryComment,
  getOwnerStoryComments,
};
