const multer = require("multer");

const storage = multer.memoryStorage();
/*
this means:-
📌 File is NOT saved on disk
📌 File is stored in RAM (memory)
📌 You get file as buffer inside req.file.buffer

you get:-
req.file = {
fieldname: 'avatar',
originalname: 'myPic.png',
mimetype: 'image/png',
buffer: <Buffer ...>,
size: 58233
}

file.mimetype comes from browser header:-
Examples:
image/jpeg
image/png
application/pdf
video/mp4

*/

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const bannerAvatarUpload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB limit for image
  fileFilter,
});

module.exports = bannerAvatarUpload;
