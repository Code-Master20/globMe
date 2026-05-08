const router = require("express").Router();
const isMeMiddleware = require("../../middleware/auth/isMe.middleware");
const zodyCredentialValidator = require("../../middleware/auth/zodCredentialValidator.middleware");
const {
  emailChangeRequestZodSchema,
  emailChangeVerifyZodSchema,
} = require("../../utils/auth/credentialValidatorSchema.util");
const {
  requestEmailChange,
  verifyEmailChange,
} = require("../../controllers/auth/changeEmail.controller");

router.post(
  "/change-email/request",
  isMeMiddleware,
  zodyCredentialValidator(emailChangeRequestZodSchema),
  requestEmailChange,
);

router.post(
  "/change-email/verify",
  isMeMiddleware,
  zodyCredentialValidator(emailChangeVerifyZodSchema),
  verifyEmailChange,
);

module.exports = router;
