const router = require("express").Router();
const {
  passResetZodSchema,
  passResetWithOtpZodSchema,
} = require("../../utils/auth/credentialValidatorSchema.util");
const zodyCredentialValidator = require("../../middleware/auth/zodCredentialValidator.middleware");
const {
  resetPasswordWithOldPassword,
  resetPasswordWithOtp,
} = require("../../middleware/auth/resetPassword.middleware");
const sendingOtpToEmail = require("../../middleware/auth/sendingOtpToEmail.middleware");
const logIn = require("../../controllers/auth/login.controller");
const otpVerify = require("../../middleware/auth/otpVerify.middleware");

router.post(
  "/reset-password-with-old-password",
  zodyCredentialValidator(passResetZodSchema),
  resetPasswordWithOldPassword,
  logIn,
);

router.post(
  "/reset-password-with-otp",
  zodyCredentialValidator(passResetWithOtpZodSchema),
  resetPasswordWithOtp,
  sendingOtpToEmail.sendingOtpForPassReset,
);

router.post("/reset-password-with-otp/verify-otp", otpVerify, logIn);

module.exports = router;
