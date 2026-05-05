const SuccessHandler = require("../../utils/successHandler.util");

const logOut = async (req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? "none" : "lax",
  });

  return new SuccessHandler(200, "Logged out successfully").send(res);
};

module.exports = logOut;
