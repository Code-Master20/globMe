const cloudinary = require("../utils/cloudinary.utils");
const User = require("../models/user.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");

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

          return new SuccessHandler(200, "DP updated successfully", user).send(
            res,
          );
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
            user,
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

module.exports = { uploadAvatar, uploadBanner, deleteAvatar, deleteBanner };
