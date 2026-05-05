const User = require("../models/auth/user.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");

const getRelationshipStatus = (viewer, targetId) => {
  const normalizedTargetId = `${targetId}`;
  const friends = viewer.friends || [];
  const friendRequestsSent = viewer.friendRequestsSent || [];
  const friendRequestsReceived = viewer.friendRequestsReceived || [];

  if (friends.some((id) => `${id}` === normalizedTargetId)) {
    return "friends";
  }

  if (friendRequestsSent.some((id) => `${id}` === normalizedTargetId)) {
    return "pending_sent";
  }

  if (friendRequestsReceived.some((id) => `${id}` === normalizedTargetId)) {
    return "pending_received";
  }

  return "none";
};

const searchUsers = async (req, res) => {
  try {
    const query = `${req.query.q ?? ""}`.trim();

    if (!query) {
      return new SuccessHandler(200, "Search results", []).send(res);
    }

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(safeQuery, "i");

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ username: searchRegex }, { email: searchRegex }],
    })
      .select("username email avatar profession location bio talent")
      .limit(12);

    const results = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      profession: user.profession,
      location: user.location,
      bio: user.bio,
      talent: user.talent,
      relationshipStatus: getRelationshipStatus(req.user, user._id),
    }));

    return new SuccessHandler(200, "Search results", results).send(res);
  } catch (error) {
    return new ErrorHandler(500, "User search failed")
      .log("user search error", error)
      .send(res);
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(req.params.targetUserId);

    if (!sender) {
      return new ErrorHandler(404, "Sender not found").send(res);
    }

    if (!receiver) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    if (`${sender._id}` === `${receiver._id}`) {
      return new ErrorHandler(400, "You cannot send a request to yourself").send(
        res,
      );
    }

    if ((sender.friends || []).some((id) => `${id}` === `${receiver._id}`)) {
      return new ErrorHandler(400, "You are already friends").send(res);
    }

    if (
      (sender.friendRequestsSent || []).some(
        (id) => `${id}` === `${receiver._id}`,
      )
    ) {
      return new ErrorHandler(400, "Friend request already sent").send(res);
    }

    if (
      (sender.friendRequestsReceived || []).some(
        (id) => `${id}` === `${receiver._id}`,
      )
    ) {
      return new ErrorHandler(
        400,
        "This user has already sent you a friend request",
      ).send(res);
    }

    sender.friendRequestsSent.push(receiver._id);
    receiver.friendRequestsReceived.push(sender._id);

    await Promise.all([sender.save(), receiver.save()]);

    return new SuccessHandler(200, "Friend request sent", {
      targetUserId: receiver._id,
      relationshipStatus: "pending_sent",
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Friend request could not be sent")
      .log("friend request error", error)
      .send(res);
  }
};

module.exports = {
  searchUsers,
  sendFriendRequest,
};
