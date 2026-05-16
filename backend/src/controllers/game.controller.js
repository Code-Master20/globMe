const GameHistory = require("../models/gameHistory.model");
const ErrorHandler = require("../utils/errorHandler.util");
const SuccessHandler = require("../utils/successHandler.util");

const GAME_DEFINITIONS = [
  {
    key: "snake-ladder-sprint",
    name: "Snake & Ladder Sprint",
    status: "available",
    category: "Board game",
    badge: "Live now",
    boardSize: 100,
    historyEnabled: true,
    description:
      "Roll the dice, move one square at a time, and race across a full 100-step board. Guests can play instantly and signed-in players keep their game history.",
  },
  {
    key: "word-flip-lab",
    name: "Word Flip Lab",
    status: "coming-soon",
    category: "Word game",
    badge: "Coming soon",
    description: "A lightweight word challenge for homepage visitors is queued next.",
  },
  {
    key: "memory-pair-rush",
    name: "Memory Pair Rush",
    status: "coming-soon",
    category: "Puzzle game",
    badge: "Coming soon",
    description: "Fast card matching rounds will join the play zone in a future update.",
  },
];

const getGameDefinition = (gameKey) =>
  GAME_DEFINITIONS.find((game) => game.key === gameKey) || null;

const normalizeInteger = (value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const nextValue = Number.parseInt(value, 10);

  if (!Number.isInteger(nextValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, nextValue));
};

const normalizeDiceRolls = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 6)
    .slice(0, 200);
};

const normalizePath = (value, boardSize) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= boardSize)
    .slice(0, 240);
};

const formatHistoryEntry = (historyDoc) => {
  if (!historyDoc) {
    return null;
  }

  const history =
    typeof historyDoc.toObject === "function" ? historyDoc.toObject() : historyDoc;

  return {
    _id: `${history._id}`,
    gameKey: history.gameKey,
    gameName: history.gameName,
    won: Boolean(history.won),
    boardSize: Number(history.boardSize) || 36,
    finalPosition: Number(history.finalPosition) || 0,
    totalRolls: Number(history.totalRolls) || 0,
    diceRolls: Array.isArray(history.diceRolls) ? history.diceRolls : [],
    path: Array.isArray(history.path) ? history.path : [],
    snakesHit: Number(history.snakesHit) || 0,
    laddersHit: Number(history.laddersHit) || 0,
    durationMs: Number(history.durationMs) || 0,
    createdAt: history.createdAt,
    updatedAt: history.updatedAt,
  };
};

const getPublicGames = async (_req, res) =>
  new SuccessHandler(200, "Homepage games loaded", GAME_DEFINITIONS).send(res);

const getMyGameHistory = async (req, res) => {
  try {
    const limit = normalizeInteger(req.query?.limit, 6, { min: 1, max: 20 });
    const gameKey = `${req.query?.gameKey ?? ""}`.trim().toLowerCase();
    const query = {
      user: req.user._id,
    };

    if (gameKey) {
      query.gameKey = gameKey;
    }

    const history = await GameHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return new SuccessHandler(
      200,
      "Game history loaded",
      history.map(formatHistoryEntry),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Game history could not be loaded")
      .log("game history load error", error)
      .send(res);
  }
};

const createGameHistoryEntry = async (req, res) => {
  try {
    const gameKey = `${req.body?.gameKey ?? ""}`.trim().toLowerCase();
    const gameDefinition = getGameDefinition(gameKey);

    if (!gameDefinition || gameDefinition.status !== "available") {
      return new ErrorHandler(400, "Unsupported game selected").send(res);
    }

    const boardSize = normalizeInteger(req.body?.boardSize, gameDefinition.boardSize || 36, {
      min: 10,
      max: 400,
    });
    const diceRolls = normalizeDiceRolls(req.body?.diceRolls);
    const path = normalizePath(req.body?.path, boardSize);
    const totalRolls = normalizeInteger(req.body?.totalRolls, diceRolls.length, {
      min: 0,
      max: 200,
    });
    const finalPosition = normalizeInteger(req.body?.finalPosition, 0, {
      min: 0,
      max: boardSize,
    });
    const historyEntry = await GameHistory.create({
      user: req.user._id,
      gameKey,
      gameName: gameDefinition.name,
      won: req.body?.won === true,
      boardSize,
      finalPosition,
      totalRolls,
      diceRolls,
      path,
      snakesHit: normalizeInteger(req.body?.snakesHit, 0, { min: 0, max: 100 }),
      laddersHit: normalizeInteger(req.body?.laddersHit, 0, { min: 0, max: 100 }),
      durationMs: normalizeInteger(req.body?.durationMs, 0, {
        min: 0,
        max: 24 * 60 * 60 * 1000,
      }),
    });

    return new SuccessHandler(
      201,
      "Game history saved",
      formatHistoryEntry(historyEntry),
    ).send(res);
  } catch (error) {
    return new ErrorHandler(500, "Game history could not be saved")
      .log("game history save error", error)
      .send(res);
  }
};

module.exports = {
  createGameHistoryEntry,
  GAME_DEFINITIONS,
  getMyGameHistory,
  getPublicGames,
};
