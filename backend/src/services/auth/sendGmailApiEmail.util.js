// googleapis is an npm package that provides JavaScript access to Google's APIs.
// Google has many APIs, such as:
// Gmail API
// Google Drive API
// Google Sheets API
// Google Calendar API
// YouTube API

// The package exports an object called google.
// Conceptually:
// const google = {
//   auth: ...,
//   gmail: ...,
//   drive: ...,
//   sheets: ...,
//   // etc.
// };
const { google } = require("googleapis");


// OAuth 2.0 is an authorization system.
// It allows you to give one application permission to access a service without giving that application your Gmail password.
// For example, you do not give your Gmail password to GlobMe.
// Instead, you authorize GlobMe's backend to use specific Gmail functionality.
// Conceptually :
// Your Gmail account
//        ↓ grants permission
// Google OAuth system
//        ↓ gives authorized tokens
// GlobMe backend
//        ↓ uses token
// Gmail API

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const sendGmailApiEmail = async ({ to, subject,html }) => {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  // suppose:
//   const messagePart = [
//     "Hello",
//     "My Name Is Sahidur Miah",
//     "I am learning JS",
//     "Thank You"
//   ];
//  const message =  messagePart.join("\n");
//  console.log(message);
//  output :-
//  Hello
//  My Name Is Sahidur Miah
//  I am learning JS
//  Thank You
  const messageParts = [
    `From: "globMe" <${process.env.MY_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html
  ];

  const message = messageParts.join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return response.data;
};

module.exports = sendGmailApiEmail;
