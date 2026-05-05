const express = require("express");
const { logInZodSchema } = require("../../utils/auth/credentialValidatorSchema.util");
const zodyCredentialValidator = require("../../middleware/auth/zodCredentialValidator.middleware");
const sendingOtpToEmail = require("../../middleware/auth/sendingOtpToEmail.middleware");
const logIn = require("../../controllers/auth/login.controller");
const otpVerify = require("../../middleware/auth/otpVerify.middleware");

const router = express.Router();

router.post(
  "/log-in",
  zodyCredentialValidator(logInZodSchema),
  sendingOtpToEmail.sendingOtpForLogIn,
);

router.post("/log-in/verify-otp", otpVerify, logIn);

module.exports = router;
