const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary.utils");
const User = require("../models/auth/user.model");
const Post = require("../models/post.model");
const StoryLike = require("../models/storyLike.model");
const Notification = require("../models/notification.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");
const toPublicUser = require("../utils/auth/publicUser.util");

const STORY_LIFETIME_MS = 36 * 60 * 60 * 1000;
const MAX_STORY_DURATION_SECONDS = 90;
const STORY_ALLOWED_POST_TYPES = ["image", "video"];
const STORY_HISTORY_LIMIT = 12;

const normalizeListInput = (value, pattern = /\r?\n|,/) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item ?? ""}`.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(pattern)
    .map((item) => item.trim())
    .filter(Boolean);
};

const uploadBufferToCloudinary = (file, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    stream.end(file.buffer);
  });

const uploadRemoteAssetToCloudinary = (url, options) =>
  cloudinary.uploader.upload(url, options);

const destroyCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary deletion failed:", error);
  }
};

const getStoryMediaTypeFromFile = (file) =>
  file?.mimetype?.startsWith("video/") ? "video" : "image";

const getUploadDurationSeconds = (uploadResult) => {
  const duration = Number(uploadResult?.duration);
  return Number.isFinite(duration) ? duration : 0;
};

const getStoryDurationError = ({ storyType, mediaUploadResult, audioUploadResult }) => {
  if (
    storyType === "video" &&
    getUploadDurationSeconds(mediaUploadResult) > MAX_STORY_DURATION_SECONDS
  ) {
    return "Story videos must be 1 minute 30 seconds or shorter";
  }

  if (getUploadDurationSeconds(audioUploadResult) > MAX_STORY_DURATION_SECONDS) {
    return "Story music must be 1 minute 30 seconds or shorter";
  }

  return "";
};

const resetStoryFields = (user) => {
  user.story = null;
  user.storyType = null;
  user.storyCloudinaryId = null;
  user.storyAudio = null;
  user.storyAudioCloudinaryId = null;
  user.storySourcePost = null;
  user.storyLikeCount = 0;
  user.storyExpiresAt = null;
  user.storyActiveHistoryId = null;
};

const appendStoryHistoryEntry = (user, storyData) => {
  const historyEntry = {
    _id: new mongoose.Types.ObjectId(),
    mediaUrl: storyData.mediaUrl,
    mediaType: storyData.mediaType || "image",
    audioUrl: storyData.audioUrl || null,
    mediaCloudinaryId: storyData.mediaCloudinaryId || null,
    audioCloudinaryId: storyData.audioCloudinaryId || null,
    sourcePost: storyData.sourcePost || null,
    likeCount: typeof storyData.likeCount === "number" ? storyData.likeCount : 0,
    expiresAt: storyData.expiresAt || null,
    createdAt: new Date(),
  };
  const existingHistory = Array.isArray(user.storyHistory) ? user.storyHistory : [];
  const nextHistory = [historyEntry, ...existingHistory].filter((item) => item?.mediaUrl);
  const trimmedEntries = nextHistory.slice(STORY_HISTORY_LIMIT);

  user.storyHistory = nextHistory.slice(0, STORY_HISTORY_LIMIT);

  return {
    historyEntry,
    trimmedEntries,
  };
};

const destroyStoryHistoryEntryAssets = async (entry) => {
  if (!entry) {
    return;
  }

  await destroyCloudinaryAsset(
    entry.mediaCloudinaryId,
    entry.mediaType === "video" ? "video" : "image",
  );
  await destroyCloudinaryAsset(entry.audioCloudinaryId, "video");
};

const removeStoryHistoryEntryById = (user, storyHistoryId) => {
  if (!Array.isArray(user.storyHistory)) {
    return null;
  }

  const targetId = `${storyHistoryId}`;
  const existingEntry =
    user.storyHistory.find((item) => `${item?._id}` === targetId) || null;

  if (!existingEntry) {
    return null;
  }

  user.storyHistory = user.storyHistory.filter((item) => `${item?._id}` !== targetId);
  return existingEntry;
};

const clearStoryLikes = async (userId) => {
  if (!userId) {
    return;
  }

  try {
    await StoryLike.deleteMany({ storyOwner: userId });
  } catch (error) {
    console.error("Story likes cleanup failed:", error);
  }
};

const buildStoryNotificationLink = (userId) => `/profile/${userId}?story=1`;

const notifyFriendsAboutStory = async (user) => {
  const friendIds = Array.from(
    new Set((user.friends || []).map((friendId) => `${friendId}`).filter(Boolean)),
  );

  if (!friendIds.length) {
    return;
  }

  await Notification.insertMany(
    friendIds.map((friendId) => ({
      user: friendId,
      actor: user._id,
      type: "story_added",
      message: `${user.username} added a new story`,
      link: buildStoryNotificationLink(user._id),
    })),
    { ordered: false },
  );
};

/* =========================
   UPLOAD AVATAR
========================= */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return new ErrorHandler(400, "No file chosen").send(res);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: "seekFi/avatar" },
      async (error, result) => {
        if (error) {
          return new ErrorHandler(500, "Cloudinary upload failed")
            .log("cloudinary error", error)
            .send(res);
        }

        try {
          // Try deleting old avatar (non-blocking cleanup)
          try {
            if (user.avatarCloudinaryId) {
              await cloudinary.uploader.destroy(user.avatarCloudinaryId);
            }
          } catch (deleteError) {
            console.error("Old avatar deletion failed:", deleteError);
          }

          user.avatar = result.secure_url;
          user.avatarCloudinaryId = result.public_id;

          await user.save();

          return new SuccessHandler(
            200,
            "DP updated successfully",
            toPublicUser(user, { viewerId: user._id }),
          ).send(res);
        } catch (dbError) {
          // Rollback newly uploaded image
          await cloudinary.uploader.destroy(result.public_id);

          return new ErrorHandler(500, "Database update failed")
            .log("database error", dbError)
            .send(res);
        }
      },
    );

    stream.end(req.file.buffer);
  } catch (error) {
    return new ErrorHandler(500, "Server Error")
      .log("unexpected error", error)
      .send(res);
  }
};

/* =========================
   UPLOAD BANNER
========================= */
const uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return new ErrorHandler(400, "No file chosen").send(res);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: "seekFi/banner" },
      async (error, result) => {
        if (error) {
          return new ErrorHandler(500, "Cloudinary upload failed")
            .log("cloudinary error", error)
            .send(res);
        }

        try {
          // Try deleting old banner (non-blocking cleanup)
          try {
            if (user.bannerCloudinaryId) {
              await cloudinary.uploader.destroy(user.bannerCloudinaryId);
            }
          } catch (deleteError) {
            console.error("Old banner deletion failed:", deleteError);
          }

          user.banner = result.secure_url;
          user.bannerCloudinaryId = result.public_id;

          await user.save();

          return new SuccessHandler(
            200,
            "Banner updated successfully",
            toPublicUser(user, { viewerId: user._id }),
          ).send(res);
        } catch (dbError) {
          // Rollback newly uploaded image
          await cloudinary.uploader.destroy(result.public_id);

          return new ErrorHandler(500, "Database update failed")
            .log("database error", dbError)
            .send(res);
        }
      },
    );

    stream.end(req.file.buffer);
  } catch (error) {
    return new ErrorHandler(500, "Server Error")
      .log("unexpected error", error)
      .send(res);
  }
};

/* =========================
   UPLOAD STORY
========================= */
const uploadStory = async (req, res) => {
  try {
    const mediaFile = req.files?.media?.[0] || null;
    const audioFile = req.files?.audio?.[0] || null;
    const sourcePostId = `${req.body?.sourcePostId ?? ""}`.trim();

    if (!mediaFile && !sourcePostId) {
      return new ErrorHandler(
        400,
        "Choose a photo or video, or pick one of your posts",
      ).send(res);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    let mediaUploadResult = null;
    let audioUploadResult = null;
    let storyType = "image";

    try {
      if (sourcePostId) {
        if (!mongoose.isValidObjectId(sourcePostId)) {
          return new ErrorHandler(400, "Invalid post selected for story").send(res);
        }

        const sourcePost = await Post.findOne({
          _id: sourcePostId,
          user: req.user.id,
        }).select("url postType");

        if (!sourcePost) {
          return new ErrorHandler(404, "Selected post was not found").send(res);
        }

        if (!STORY_ALLOWED_POST_TYPES.includes(sourcePost.postType)) {
          return new ErrorHandler(
            400,
            "Only image and video posts can be used as stories",
          ).send(res);
        }

        storyType = sourcePost.postType;
        mediaUploadResult = await uploadRemoteAssetToCloudinary(sourcePost.url, {
          folder: "seekFi/story/media",
          resource_type: "auto",
        });
        user.storySourcePost = sourcePost._id;
      } else {
        storyType = getStoryMediaTypeFromFile(mediaFile);
        mediaUploadResult = await uploadBufferToCloudinary(mediaFile, {
          folder: "seekFi/story/media",
          resource_type: "auto",
        });
        user.storySourcePost = null;
      }

      if (audioFile) {
        audioUploadResult = await uploadBufferToCloudinary(audioFile, {
          folder: "seekFi/story/audio",
          resource_type: "video",
        });
      }
    } catch (uploadError) {
      if (mediaUploadResult?.public_id) {
        await destroyCloudinaryAsset(
          mediaUploadResult.public_id,
          storyType === "video" ? "video" : "image",
        );
      }

      if (audioUploadResult?.public_id) {
        await destroyCloudinaryAsset(audioUploadResult.public_id, "video");
      }

      return new ErrorHandler(500, "Cloudinary upload failed")
        .log("cloudinary error", uploadError)
        .send(res);
    }

    const durationError = getStoryDurationError({
      storyType,
      mediaUploadResult,
      audioUploadResult,
    });

    if (durationError) {
      await destroyCloudinaryAsset(
        mediaUploadResult?.public_id,
        storyType === "video" ? "video" : "image",
      );
      await destroyCloudinaryAsset(audioUploadResult?.public_id, "video");

      return new ErrorHandler(400, durationError).send(res);
    }

    try {
      await clearStoryLikes(user._id);
      user.story = mediaUploadResult.secure_url;
      user.storyType = storyType;
      user.storyCloudinaryId = mediaUploadResult.public_id;
      user.storyAudio = audioUploadResult?.secure_url || null;
      user.storyAudioCloudinaryId = audioUploadResult?.public_id || null;
      user.storyLikeCount = 0;
      user.storyExpiresAt = new Date(Date.now() + STORY_LIFETIME_MS);
      const { historyEntry, trimmedEntries } = appendStoryHistoryEntry(user, {
        mediaUrl: mediaUploadResult.secure_url,
        mediaType: storyType,
        audioUrl: audioUploadResult?.secure_url || null,
        mediaCloudinaryId: mediaUploadResult.public_id,
        audioCloudinaryId: audioUploadResult?.public_id || null,
        sourcePost: user.storySourcePost || null,
        likeCount: 0,
        expiresAt: user.storyExpiresAt,
      });
      user.storyActiveHistoryId = historyEntry._id;

      await user.save();

      await Promise.all(trimmedEntries.map((entry) => destroyStoryHistoryEntryAssets(entry)));

      try {
        await notifyFriendsAboutStory(user);
      } catch (notificationError) {
        console.error("story notification error", notificationError);
      }

      return new SuccessHandler(
        200,
        "Story uploaded successfully",
        toPublicUser(user, { viewerId: user._id }),
      ).send(res);
    } catch (dbError) {
      await destroyCloudinaryAsset(
        mediaUploadResult?.public_id,
        storyType === "video" ? "video" : "image",
      );
      await destroyCloudinaryAsset(audioUploadResult?.public_id, "video");

      return new ErrorHandler(500, "Database update failed")
        .log("database error", dbError)
        .send(res);
    }
  } catch (error) {
    return new ErrorHandler(500, "Server Error")
      .log("unexpected error", error)
      .send(res);
  }
};

const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.avatarCloudinaryId) {
      return res.status(400).json({
        success: false,
        message: "No avatar to delete",
      });
    }

    await cloudinary.uploader.destroy(user.avatarCloudinaryId);

    user.avatar = null;
    user.avatarCloudinaryId = null;

    await user.save();

    res.json({
      success: true,
      message: "Avatar deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.bannerCloudinaryId) {
      return res.status(400).json({
        success: false,
        message: "No banner to delete",
      });
    }

    await cloudinary.uploader.destroy(user.bannerCloudinaryId);

    user.banner = null;
    user.bannerCloudinaryId = null;

    await user.save();

    res.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

const deleteStory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    if (!user.story && !user.storyCloudinaryId) {
      return new ErrorHandler(400, "No story to delete").send(res);
    }

    const activeHistoryId = user.storyActiveHistoryId;
    const removedEntry = activeHistoryId
      ? removeStoryHistoryEntryById(user, activeHistoryId)
      : null;

    if (removedEntry) {
      await destroyStoryHistoryEntryAssets(removedEntry);
    } else {
      await destroyCloudinaryAsset(
        user.storyCloudinaryId,
        user.storyType === "video" ? "video" : "image",
      );
      await destroyCloudinaryAsset(user.storyAudioCloudinaryId, "video");
    }

    await clearStoryLikes(user._id);

    resetStoryFields(user);

    await user.save();

    return new SuccessHandler(
      200,
      "Story removed successfully",
      toPublicUser(user, { viewerId: user._id }),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story could not be deleted")
      .log("story delete error", error)
      .send(res);
  }
};

const deleteStoryHistoryEntry = async (req, res) => {
  try {
    const { storyHistoryId } = req.params;

    if (!mongoose.isValidObjectId(storyHistoryId)) {
      return new ErrorHandler(400, "Invalid story selected").send(res);
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const removedEntry = removeStoryHistoryEntryById(user, storyHistoryId);

    if (!removedEntry) {
      return new ErrorHandler(404, "Story was not found").send(res);
    }

    const isActiveStory = user.storyActiveHistoryId
      ? `${user.storyActiveHistoryId}` === `${storyHistoryId}`
      : false;

    if (isActiveStory) {
      await clearStoryLikes(user._id);
      resetStoryFields(user);
    }

    await destroyStoryHistoryEntryAssets(removedEntry);
    await user.save();

    return new SuccessHandler(
      200,
      "Story removed successfully",
      toPublicUser(user, { viewerId: user._id }),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story could not be deleted")
      .log("story history delete error", error)
      .send(res);
  }
};

const getStoryEligiblePosts = async (req, res) => {
  try {
    const posts = await Post.find({
      user: req.user.id,
      postType: { $in: STORY_ALLOWED_POST_TYPES },
    })
      .select("title description url postType createdAt")
      .sort({ createdAt: -1 })
      .limit(24);

    return new SuccessHandler(200, "Eligible story posts", posts).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Story posts could not be loaded")
      .log("story posts error", error)
      .send(res);
  }
};

const updateProfileDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const {
      username,
      bio,
      location,
      profession,
      talent,
      status,
      gender,
      dob,
      profileVisibility,
    } = req.body;

    if (!username || !`${username}`.trim()) {
      return new ErrorHandler(400, "Username is required").send(res);
    }

    user.username = `${username}`.trim();
    user.bio = normalizeListInput(bio, /\r?\n/);
    user.location = normalizeListInput(location);
    user.profession = `${profession ?? ""}`.trim() || null;
    user.talent = normalizeListInput(talent, /\r?\n|,/);
    user.status = `${status ?? ""}`.trim() || null;
    user.gender = `${gender ?? ""}`.trim() || null;
    user.dob = `${dob ?? ""}`.trim() || null;

    if (profileVisibility && typeof profileVisibility === "object") {
      const visibilityKeys = [
        "email",
        "profession",
        "bio",
        "location",
        "talent",
        "status",
        "gender",
        "dob",
        "friendsCount",
        "followersCount",
        "followingCount",
      ];

      visibilityKeys.forEach((key) => {
        if (typeof profileVisibility[key] === "boolean") {
          user.profileVisibility[key] = profileVisibility[key];
        }
      });
    }

    await user.save();

    return new SuccessHandler(
      200,
      "Profile updated successfully",
      toPublicUser(user, { viewerId: user._id }),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Profile could not be updated")
      .log("profile update error", error)
      .send(res);
  }
};

const updateCreatorMode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const { creator } = req.body;

    if (typeof creator !== "boolean") {
      return new ErrorHandler(400, "Creator mode must be true or false").send(
        res,
      );
    }

    user.creator = creator;
    await user.save();

    return new SuccessHandler(
      200,
      creator ? "Creator mode enabled" : "Creator mode disabled",
      toPublicUser(user, { viewerId: user._id }),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Creator mode could not be updated")
      .log("creator mode update error", error)
      .send(res);
  }
};

const getProfileView = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id || req.user?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return new ErrorHandler(400, "Invalid profile id").send(res);
    }

    const user = await User.findById(userId);
    const viewer = viewerId
      ? await User.findById(viewerId).select(
          "friends friendRequestsSent friendRequestsReceived",
        )
      : null;

    if (!user) {
      return new ErrorHandler(404, "Profile not found").send(res);
    }

    let relationshipStatus = null;

    if (viewer && `${viewer._id}` !== `${user._id}`) {
      const normalizedTargetId = `${user._id}`;
      const friends = viewer.friends || [];
      const friendRequestsSent = viewer.friendRequestsSent || [];
      const friendRequestsReceived = viewer.friendRequestsReceived || [];

      if (friends.some((id) => `${id}` === normalizedTargetId)) {
        relationshipStatus = "friends";
      } else if (
        friendRequestsSent.some((id) => `${id}` === normalizedTargetId)
      ) {
        relationshipStatus = "pending_sent";
      } else if (
        friendRequestsReceived.some((id) => `${id}` === normalizedTargetId)
      ) {
        relationshipStatus = "pending_received";
      } else {
        relationshipStatus = "none";
      }
    }

    const publicUser = toPublicUser(user, { viewerId });

    if (relationshipStatus) {
      publicUser.relationshipStatus = relationshipStatus;
    }

    return new SuccessHandler(
      200,
      "Profile loaded successfully",
      publicUser,
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Profile could not be loaded")
      .log("profile view error", error)
      .send(res);
  }
};

module.exports = {
  uploadAvatar,
  uploadBanner,
  uploadStory,
  deleteAvatar,
  deleteBanner,
  deleteStory,
  getStoryEligiblePosts,
  updateProfileDetails,
  updateCreatorMode,
  getProfileView,
  deleteStoryHistoryEntry,
};
