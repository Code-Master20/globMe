//this file I will use only during development
const nodemailer = require("nodemailer");
const nodeMailerEmailService = async ({ to, subject, html }) => {
  // here to is the email f the user to whome otp to be sent
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_EMAIL,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const verificationCode = await transporter.sendMail({
      from: `"globMe" <${process.env.MY_EMAIL}>`,
      to,
      subject,
      html,
    });

    // console.log(verificationCode);

    return verificationCode;
  } catch (error) {
    // console.error("email Error", error);
    throw error;
  }
};

module.exports = nodeMailerEmailService;
