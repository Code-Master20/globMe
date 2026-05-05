const toPublicUser = require("../../utils/auth/publicUser.util");
const SuccessHandler = require("../../utils/successHandler.util");

const isMe = (req, res) => {
  return new SuccessHandler(
    200,
    "Successfully Authenticated",
    toPublicUser(req.user, { viewerId: req.user._id }),
  ).send(res);
};

module.exports = isMe;
