const router = require("express").Router();
const { deletePost } = require("../controllers/post.controller");
const isMeMiddleware = require("../middlewares/expressMiddleware/isMe.middleware");

router.delete("/delete-post/:id", isMeMiddleware, deletePost);

module.exports = router;
