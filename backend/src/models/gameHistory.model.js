const mongoose = require("mongoose");

const gameHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    gameName: {
      type: String,
      required: true,
      trim: true,
    },
    won: {
      type: Boolean,
      default: false,
    },
    boardSize: {
      type: Number,
      default: 36,
    },
    finalPosition: {
      type: Number,
      default: 0,
    },
    totalRolls: {
      type: Number,
      default: 0,
    },
    diceRolls: [
      {
        type: Number,
        min: 1,
        max: 6,
      },
    ],
    path: [
      {
        type: Number,
        min: 0,
      },
    ],
    snakesHit: {
      type: Number,
      default: 0,
    },
    laddersHit: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

gameHistorySchema.index({ user: 1, gameKey: 1, createdAt: -1 });

module.exports = mongoose.model("GameHistory", gameHistorySchema);
