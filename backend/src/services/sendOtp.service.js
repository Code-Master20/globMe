// services/sendOtp.service.js
const crypto = require("node:crypto");
const EmailOtp = require("../models/emailOtp.model");
const nodeMailerEmailService = require("./nodeMailerEmailService.util");
const sendGmailApiEmail = require("./sendGmailApiEmail.util");

const sendOtp = async ({ email, purpose }) => {
  let otp = "";
  for (let i = 0; i < 8; i++) {
    otp += crypto.randomInt(0, 10);
  }
  // const otp = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join(""); one line code for otp generation

  await EmailOtp.deleteMany({ email, purpose });

  await EmailOtp.create({
    email,
    otp,
    purpose,
  });

  const isProd = process.env.NODE_ENV === "production";

  //this is I am using only for localHost texting email services
  if (!isProd) {
      await nodeMailerEmailService({
        to: email,
        subject: "Email verification code",
        text: "Welcome to globMe",
        html: `
      <h3>Your verification code</h3>
      <p><b>${otp}</b></p>
    `,
    });
  } else {
    await sendGmailApiEmail({
      to: email,
      subject: "Email Verification Code",
      html: `
    <h2>Your verification Code</h2>
    <p><b>${otp}</b></p>
  `,
    });
  }
};

module.exports = sendOtp;
