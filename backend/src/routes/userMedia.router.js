// for uploading profile pic, banner pic and story adding sometimes.
// or sometimes story will be added from remaining posts or some user's posts
const router = require("express").Router();
const multer = require("multer");
const bannerAvatarUpload = require("../middleware/uploads/multer.banner.avatar.middleware");
const isMeMiddleware = require("../middleware/auth/isMe.middleware");
const ErrorHandler = require("../utils/errorHandler.util");
const {
  uploadAvatar,
  uploadBanner,
  deleteAvatar,
  deleteBanner,
  updateProfileDetails,
  updateCreatorMode,
  getProfileView,
} = require("../controllers/userMedia.controller");

const handleSingleImageUpload = (fieldName) => (req, res, next) => {
  bannerAvatarUpload.single(fieldName)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return new ErrorHandler(400, "Image file is too large").send(res);
    }

    return new ErrorHandler(400, error.message || "Image upload failed").send(res);
  });
};

router.post(
  "/upload-avatar",
  isMeMiddleware,
  handleSingleImageUpload("image"),
  uploadAvatar,
);

router.post(
  "/upload-banner",
  isMeMiddleware,
  handleSingleImageUpload("image"),
  uploadBanner,
);

router.patch("/profile", isMeMiddleware, updateProfileDetails);
router.patch("/profile/creator", isMeMiddleware, updateCreatorMode);
router.get("/profile/:userId", isMeMiddleware, getProfileView);

router.delete("/delete-avatar", isMeMiddleware, deleteAvatar);
router.delete("/delete-banner", isMeMiddleware, deleteBanner);

module.exports = router;
