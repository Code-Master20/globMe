const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary.utils");
const User = require("../models/auth/user.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");
const toPublicUser = require("../utils/auth/publicUser.util");

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

const getProfileView = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id || req.user?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return new ErrorHandler(400, "Invalid profile id").send(res);
    }

    const user = await User.findById(userId);

    if (!user) {
      return new ErrorHandler(404, "Profile not found").send(res);
    }

    return new SuccessHandler(
      200,
      "Profile loaded successfully",
      toPublicUser(user, { viewerId }),
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
  deleteAvatar,
  deleteBanner,
  updateProfileDetails,
  getProfileView,
};
