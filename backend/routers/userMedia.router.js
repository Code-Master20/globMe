// for uploading profile pic, banner pic and story adding sometimes.
// or sometimes story will be added from remaining posts or some user's posts
const router = require("express").Router();
const bannerAvatarUpload = require("../middlewares/expressMiddleware/multer.banner.avatar.middleware");
const isMeMiddleware = require("../middlewares/expressMiddleware/isMe.middleware");
const {
  uploadAvatar,
  uploadBanner,
  deleteAvatar,
  deleteBanner,
} = require("../controllers/userMedia.controller");

router.post(
  "/upload-avatar",
  isMeMiddleware,
  bannerAvatarUpload.single("image"),
  uploadAvatar,
);

router.post(
  "/upload-banner",
  isMeMiddleware,
  bannerAvatarUpload.single("image"),
  uploadBanner,
);

router.delete("/delete-avatar", isMeMiddleware, deleteAvatar);
router.delete("/delete-banner", isMeMiddleware, deleteBanner);

module.exports = router;
