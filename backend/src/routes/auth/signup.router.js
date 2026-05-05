const express = require("express");
const { signUpZodSchema } = require("../../utils/auth/credentialValidatorSchema.util");
const zodyCredentialValidator = require("../../middleware/auth/zodCredentialValidator.middleware");
const signUp = require("../../controllers/auth/signup.controller");
const sendingOtpToEmail = require("../../middleware/auth/sendingOtpToEmail.middleware");
const otpVerify = require("../../middleware/auth/otpVerify.middleware");

const router = express.Router();

router.post(
  "/sign-up",
  zodyCredentialValidator(signUpZodSchema),
  sendingOtpToEmail.sendingOtpForSignUp,
);

router.post("/sign-up/verify-otp", otpVerify, signUp);

module.exports = router;
