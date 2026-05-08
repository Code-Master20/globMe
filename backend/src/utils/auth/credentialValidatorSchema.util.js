const { z } = require("zod");
const validator = require("validator");

//==================================reusable zod object properties==============================
const passwordSchema = z
  .string({ required_error: "password is required" })
  .trim()
  .nonempty({ message: "password is required" })
  .min(8, { message: "must be of atleast 8 chars long" })
  .max(20, { message: "must not exceed 20 characters" })
  .regex(/[A-Z]/, { message: "atleast an uppercase letter" })
  .regex(/[a-z]/, { message: "atleast one lowercase letter" })
  .regex(/[0-9]/, { message: "atleast one digit please" })
  // .regex(/[^A-Za-z0-9]/,{message:"atleast one special character"})
  .refine(
    (val) =>
      validator.isStrongPassword(val, {
        minSymbols: 1,
      }),
    {
      message: "atleast one special character",
    },
  );

const usernameSchema = z
  .string({ required_error: "username is required" })
  .trim()
  .nonempty({ message: "name can't be empty" })
  .min(3, { message: "must be at least 3 characters long" })
  .max(30, { message: "must not exceed 30 characters" })
  .superRefine((value, ctx) => {
    if (/\d/.test(value)) {
      ctx.addIssue({
        code: "digit included name",
        message: "digits are not allowed in name",
      });
    }

    if (/[^A-Za-z\s\d]/.test(value)) {
      ctx.addIssue({
        code: "special char included name",
        message: "special characters are not allowed in name",
      });
    }
  });

const emailSchema = z
  .string({ required_error: "email is required" })
  .trim()
  .nonempty({ message: "email can't be empty" })
  .lowercase({ message: "email usually in lowercase" })
  .refine(validator.isEmail, { message: "invalid email format" });

const otpSchema = z
  .string({ required_error: "otp is required" })
  .trim()
  .length(8, { message: "otp must be 8 digits" })
  .regex(/^\d+$/, { message: "otp must be numeric" });

//========================zodErrorSchema========================
const logInZodSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signUpZodSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const passResetZodSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    newPassword: passwordSchema,
  })
  .refine((data) => data.password !== data.newPassword, {
    message: "New password must be different from old password",
    path: ["newPassword"],
  });

const passResetWithOtpZodSchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

const emailChangeRequestZodSchema = z.object({
  newEmail: emailSchema,
});

const emailChangeVerifyZodSchema = z.object({
  newEmail: emailSchema,
  currentEmailOtp: otpSchema,
  newEmailOtp: otpSchema,
});

module.exports = {
  signUpZodSchema,
  logInZodSchema,
  passResetZodSchema,
  passResetWithOtpZodSchema,
  emailChangeRequestZodSchema,
  emailChangeVerifyZodSchema,
};
