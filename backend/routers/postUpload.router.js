const router = require("express").Router();
const upload = require("../middlewares/expressMiddleware/multer.middleware");
const uploadImage = require("../controllers/uploadImage.controller");
const isMeMiddleware = require("../middlewares/expressMiddleware/isMe.middleware");

router.post(
  "/upload-image",
  isMeMiddleware,
  upload.single("file"),
  uploadImage,
);

module.exports = router;
