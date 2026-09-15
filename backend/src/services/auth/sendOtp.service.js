const crypto = require("node:crypto");
const EmailOtp = require("../../models/auth/emailOtp.model");
const nodeMailerEmailService = require("./nodeMailerEmailService.util");
const sendGmailApiEmail = require("./sendGmailApiEmail.util");

const sendOtp = async ({ email, purpose }) => {
  let otp = "";

  // Generate a 6-digit OTP
  for (let i = 0; i < 6; i++) {
    otp += crypto.randomInt(0, 10);
  }

  await EmailOtp.deleteMany({ email, purpose });
  await EmailOtp.create({ email, otp, purpose }); //initialize a document in EmailOtp model to store otp,email,purpose

  const isProd = process.env.NODE_ENV === "production";

  // Reusable email HTML template
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification Code</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f7fb;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
        "
      >
        <div style="padding: 40px 15px;">
          <div
            style="
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 14px;
              overflow: hidden;
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            "
          >
            <!-- Header -->
            <div
              style="
                padding: 28px 20px;
                text-align: center;
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
              "
            >
              <h1
                style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 28px;
                  letter-spacing: 1px;
                "
              >
                globMe
              </h1>

              <p
                style="
                  margin: 8px 0 0;
                  color: #e0e7ff;
                  font-size: 14px;
                "
              >
                Connect. Share. Explore.
              </p>
            </div>

            <!-- Main content -->
            <div style="padding: 35px 30px; text-align: center;">
              <h2
                style="
                  margin: 0 0 12px;
                  color: #111827;
                  font-size: 23px;
                "
              >
                Verify Your Email
              </h2>

              <p
                style="
                  margin: 0 0 25px;
                  color: #6b7280;
                  font-size: 15px;
                  line-height: 1.6;
                "
              >
                Use the verification code below to continue with your
                globMe account.
              </p>

              <!-- OTP box -->
              <div
                style="
                  display: inline-block;
                  padding: 16px 28px;
                  background-color: #eef2ff;
                  border: 1px dashed #6366f1;
                  border-radius: 10px;
                  margin-bottom: 25px;
                "
              >
                <span
                  style="
                    color: #4338ca;
                    font-size: 34px;
                    font-weight: bold;
                    letter-spacing: 9px;
                  "
                >
                  ${otp}
                </span>
              </div>

              <p
                style="
                  margin: 0;
                  color: #6b7280;
                  font-size: 13px;
                  line-height: 1.6;
                "
              >
                This code will expire in
                <strong style="color: #374151;">5 minutes</strong>.
              </p>

              <p
                style="
                  margin: 20px 0 0;
                  color: #9ca3af;
                  font-size: 12px;
                  line-height: 1.5;
                "
              >
                If you did not request this code, you can safely ignore
                this email. Never share your verification code with anyone.
              </p>
            </div>

            <!-- Footer -->
            <div
              style="
                padding: 18px 20px;
                text-align: center;
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
              "
            >
              <p
                style="
                  margin: 0;
                  color: #9ca3af;
                  font-size: 12px;
                "
              >
                © ${new Date().getFullYear()} globMe. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  if (!isProd) {
    await nodeMailerEmailService({
      to: email,
      subject: "GlobMe Email Verification Code",
      html: emailHtml,
    });
  } else {
    await sendGmailApiEmail({
      to: email,
      subject: "GlobMe Email Verification Code",
      html: emailHtml,
    });
  }
};

module.exports = sendOtp;