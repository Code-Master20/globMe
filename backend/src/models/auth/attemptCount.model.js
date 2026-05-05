const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const attemptCountSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },

    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AttemptCount", attemptCountSchema);
