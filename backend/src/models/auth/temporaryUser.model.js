const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const temporaryUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    bio: {
      type: [String], // <-- Array of strings
      trim: true,
    },
    status: {
      //maried, unmarried, single, relationships, divorced, etc
      type: String,
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      trim: true,
      lowercase: true,
    },
    dob: {
      type: String,
    },

    talent: {
      type: [String],
      trim: true,
      lowercase: true,
    },
    profession: {
      type: String, //doctor, teacher, nurse, police, army, cifs, bsf, software-developer, etc
      trim: true,
      lowercase: true,
    },

    avatar: {
      type: String,
      trim: true,
    },
    banner: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    creator: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 15 * 60 * 1000, // 15 minutes
    },
  },
  {
    timestamps: true,
  },
);

temporaryUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TemporaryUser = mongoose.model("TemporaryUser", temporaryUserSchema);

module.exports = TemporaryUser;
