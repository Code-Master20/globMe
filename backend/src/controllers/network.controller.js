const User = require("../models/auth/user.model");
const Notification = require("../models/notification.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");
const sendRelationshipEmail = require("../services/network/sendRelationshipEmail.util");

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

const getReceivedFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate(
        "friendRequestsReceived",
        "username email avatar profession location bio talent",
      )
      .select("friendRequestsReceived");

    if (!user) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    const requests = (user.friendRequestsReceived || []).map((requestUser) => ({
      _id: requestUser._id,
      username: requestUser.username,
      email: requestUser.email,
      avatar: requestUser.avatar,
      profession: requestUser.profession,
      location: requestUser.location,
      bio: requestUser.bio,
      talent: requestUser.talent,
    }));

    return new SuccessHandler(200, "Friend requests", requests).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Could not fetch friend requests")
      .log("friend requests error", error)
      .send(res);
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate("actor", "username email avatar profession")
      .sort({ createdAt: -1 })
      .limit(30);

    const normalizedNotifications = notifications.map((notification) => ({
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt,
      actor: notification.actor
        ? {
            _id: notification.actor._id,
            username: notification.actor.username,
            email: notification.actor.email,
            avatar: notification.actor.avatar,
            profession: notification.actor.profession,
          }
        : null,
    }));

    const unreadCount = notifications.filter((item) => !item.read).length;

    return new SuccessHandler(200, "Notifications", {
      items: normalizedNotifications,
      unreadCount,
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Could not fetch notifications")
      .log("notifications error", error)
      .send(res);
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    );

    return new SuccessHandler(200, "Notifications marked as read", {
      unreadCount: 0,
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Could not update notifications")
      .log("notification read error", error)
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
    await Notification.create({
      user: receiver._id,
      actor: sender._id,
      type: "friend_request",
      message: `${sender.username} sent you a friend request`,
    });

    try {
      await sendRelationshipEmail({
        to: receiver.email,
        subject: "New friend request on globMe",
        text: `${sender.username} sent you a friend request on globMe.`,
        html: `
          <h2>New friend request</h2>
          <p><b>${sender.username}</b> sent you a friend request on globMe.</p>
          <p>Open your People page to review it.</p>
        `,
      });
    } catch (emailError) {
      console.error("friend request email error", emailError);
    }

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

const acceptFriendRequest = async (req, res) => {
  try {
    const receiver = await User.findById(req.user._id);
    const sender = await User.findById(req.params.requesterUserId);

    if (!receiver) {
      return new ErrorHandler(404, "User not found").send(res);
    }

    if (!sender) {
      return new ErrorHandler(404, "Request sender not found").send(res);
    }

    const hasIncomingRequest = (receiver.friendRequestsReceived || []).some(
      (id) => `${id}` === `${sender._id}`,
    );

    if (!hasIncomingRequest) {
      return new ErrorHandler(400, "No pending request from this user").send(res);
    }

    receiver.friendRequestsReceived = (receiver.friendRequestsReceived || []).filter(
      (id) => `${id}` !== `${sender._id}`,
    );
    sender.friendRequestsSent = (sender.friendRequestsSent || []).filter(
      (id) => `${id}` !== `${receiver._id}`,
    );

    if (!(receiver.friends || []).some((id) => `${id}` === `${sender._id}`)) {
      receiver.friends.push(sender._id);
    }

    if (!(sender.friends || []).some((id) => `${id}` === `${receiver._id}`)) {
      sender.friends.push(receiver._id);
    }

    await Promise.all([receiver.save(), sender.save()]);
    await Notification.create({
      user: sender._id,
      actor: receiver._id,
      type: "request_accepted",
      message: `${receiver.username} accepted your friend request`,
    });

    try {
      await sendRelationshipEmail({
        to: sender.email,
        subject: "Your friend request was accepted",
        text: `${receiver.username} accepted your friend request on globMe.`,
        html: `
          <h2>Friend request accepted</h2>
          <p><b>${receiver.username}</b> accepted your friend request on globMe.</p>
          <p>You are now connected as friends.</p>
        `,
      });
    } catch (emailError) {
      console.error("friend acceptance email error", emailError);
    }

    return new SuccessHandler(200, "Friend request accepted", {
      friendId: sender._id,
      relationshipStatus: "friends",
    }).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Friend request could not be accepted")
      .log("friend acceptance error", error)
      .send(res);
  }
};

module.exports = {
  searchUsers,
  getReceivedFriendRequests,
  getNotifications,
  markNotificationsRead,
  sendFriendRequest,
  acceptFriendRequest,
};
