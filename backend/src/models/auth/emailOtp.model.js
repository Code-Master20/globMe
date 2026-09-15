// models/emailOtp.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        "signup",
        "login",
        "reset-password",
        "change-email-old",
        "change-email-new",
      ],
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    expiresAt: { //OTP will expire after 5 mins 
      type: Date,
      default: () => Date.now() + 5 * 60 * 1000,
    },
  },
  { timestamps: true },
);


// hashing opt before final saving otp to the mongodb for 5 mins
emailOtpSchema.pre("save", async function () {
  try {
    // if otp is already on mongodb isModified is true then !this.isModified("otp")==false so hashing started
    if (!this.isModified("otp")) return;
    const saltRounds = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(String(this.otp), saltRounds);
    return;
  } catch (error) {
    console.log("otp could not be hashed", error);
    throw error;
    // return;
  }
});

emailOtpSchema.methods.compareOtp = async function (enteredOtp) {
  try {
    const comparedOtp = await bcrypt.compare(String(enteredOtp), this.otp);
    return comparedOtp;
  } catch (error) {
    console.log("otp could not be compared");
    throw error;
  }
};

emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); //this ensures tht this document will be expired after 5 mins

const EmailOtp = mongoose.model("EmailOtp", emailOtpSchema);
module.exports = EmailOtp;
