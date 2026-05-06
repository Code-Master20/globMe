const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
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

    location: {
      type: [String],
      trim: true,
      lowercase: true,
    },

    status: {
      //maried, unmarried, single, relationships, divorced, etc
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    gender: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    dob: {
      type: String,
      default: null,
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
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },
    avatarCloudinaryId: {
      type: String,
    },
    banner: {
      type: String,
      default: null,
    },
    bannerCloudinaryId: {
      type: String,
    },
    story: {
      type: String,
      default: null,
    },
    storyCloudinaryId: {
      type: String,
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
      trim: true,
    },
    creator: {
      type: Boolean,
      default: false,
    },

    profileVisibility: {
      email: {
        type: Boolean,
        default: true,
      },
      profession: {
        type: Boolean,
        default: true,
      },
      bio: {
        type: Boolean,
        default: true,
      },
      location: {
        type: Boolean,
        default: true,
      },
      talent: {
        type: Boolean,
        default: true,
      },
      status: {
        type: Boolean,
        default: true,
      },
      gender: {
        type: Boolean,
        default: true,
      },
      dob: {
        type: Boolean,
        default: true,
      },
      friendsCount: {
        type: Boolean,
        default: true,
      },
      followersCount: {
        type: Boolean,
        default: false,
      },
      followingCount: {
        type: Boolean,
        default: false,
      },
    },

    friendRequestsSent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friendRequestsReceived: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friendRequestRejectsSent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friendRequestRejectsReceived: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  try {
    if (!this.isModified("password")) return;
    const saltRounds = await bcrypt.genSalt(10);
    const passwordHashed = await bcrypt.hash(this.password, saltRounds);
    this.password = passwordHashed;
    return;
  } catch (error) {
    console.error("password could not be hashed");
    throw error;
  }
});

userSchema.methods.generateLogTrackTkn = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
    },
    process.env.JWT_LOGGED_TRACK_SECRET_KEY,
    {
      expiresIn: process.env.JWT_LOGGED_TRACK_TKN_EXPIRY, // e.g. "30d"
    },
  );
};

userSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    const passwordCompared = await bcrypt.compare(
      enteredPassword,
      this.password,
    );
    return passwordCompared;
  } catch (error) {
    console.log("password could not be compared");
    throw error;
  }
};

const User = mongoose.model("User", userSchema);
module.exports = User;
