const nodeMailerEmailService = require("../auth/nodeMailerEmailService.util");
const sendGmailApiEmail = require("../auth/sendGmailApiEmail.util");

const sendRelationshipEmail = async ({ to, subject, html, text }) => {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    return nodeMailerEmailService({
      to,
      subject,
      html,
      text,
    });
  }

  return sendGmailApiEmail({
    to,
    subject,
    html,
    text,
  });
};

module.exports = sendRelationshipEmail;
