const router = require("express").Router();
const isMeMiddleware = require("../middleware/auth/isMe.middleware");
const {
  searchUsers,
  sendFriendRequest,
} = require("../controllers/network.controller");

router.get("/search-users", isMeMiddleware, searchUsers);
router.post(
  "/friend-requests/:targetUserId",
  isMeMiddleware,
  sendFriendRequest,
);

module.exports = router;
