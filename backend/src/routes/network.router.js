const router = require("express").Router();
const isMeMiddleware = require("../middleware/auth/isMe.middleware");
const {
  searchUsers,
  getReceivedFriendRequests,
  getNotifications,
  markNotificationsRead,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} = require("../controllers/network.controller");

router.get("/search-users", isMeMiddleware, searchUsers);
router.get("/friend-requests/received", isMeMiddleware, getReceivedFriendRequests);
router.get("/notifications", isMeMiddleware, getNotifications);
router.post(
  "/friend-requests/:targetUserId",
  isMeMiddleware,
  sendFriendRequest,
);
router.post(
  "/friend-requests/:requesterUserId/accept",
  isMeMiddleware,
  acceptFriendRequest,
);
router.post(
  "/friend-requests/:requesterUserId/reject",
  isMeMiddleware,
  rejectFriendRequest,
);
router.patch("/notifications/read", isMeMiddleware, markNotificationsRead);

module.exports = router;
