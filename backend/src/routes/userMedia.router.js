// for uploading profile pic, banner pic and story adding sometimes.
// or sometimes story will be added from remaining posts or some user's posts
const router = require("express").Router();
const multer = require("multer");
const bannerAvatarUpload = require("../middleware/uploads/multer.banner.avatar.middleware");
const isMeMiddleware = require("../middleware/auth/isMe.middleware");
const optionalAuthMiddleware = require("../middleware/auth/optionalAuth.middleware");
const ErrorHandler = require("../utils/errorHandler.util");
const { toggleStoryLike } = require("../controllers/story.controller");
const {
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

const storyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const isMediaField = file.fieldname === "media";
    const isAudioField = file.fieldname === "audio";
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    const allowedAudioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/mp4",
      "audio/aac",
    ];

    if (
      isMediaField &&
      [...allowedImageTypes, ...allowedVideoTypes].includes(file.mimetype)
    ) {
      callback(null, true);
      return;
    }

    if (isAudioField && allowedAudioTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new Error(
        isAudioField
          ? "Only audio files are allowed for story music"
          : "Only image or video files are allowed for stories",
      ),
      false,
    );
  },
});

const handleStoryUpload = (req, res, next) => {
  storyUpload.fields([
    { name: "media", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ])(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return new ErrorHandler(400, "Story media file is too large").send(res);
    }

    return new ErrorHandler(400, error.message || "Story upload failed").send(res);
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

router.post(
  "/upload-story",
  isMeMiddleware,
  handleStoryUpload,
  uploadStory,
);

router.get("/story-posts", isMeMiddleware, getStoryEligiblePosts);
router.post("/stories/:userId/like", isMeMiddleware, toggleStoryLike);
router.patch("/profile", isMeMiddleware, updateProfileDetails);
router.patch("/profile/creator", isMeMiddleware, updateCreatorMode);
router.get("/profile/:userId", optionalAuthMiddleware, getProfileView);

router.delete("/delete-avatar", isMeMiddleware, deleteAvatar);
router.delete("/delete-banner", isMeMiddleware, deleteBanner);
router.delete("/delete-story", isMeMiddleware, deleteStory);

module.exports = router;
