export const SNAKE_LADDER_GAME_KEY = "snake-ladder-sprint";

export const DEFAULT_GAMES = [
  {
    key: SNAKE_LADDER_GAME_KEY,
    name: "Snake & Ladder Sprint",
    cardTitle: "SNAKE & LADDER GAME",
    status: "available",
    category: "Board game",
    badge: "Live now",
    boardSize: 100,
    historyEnabled: true,
    description: "Snake and ladder game",
  },
  {
    key: "word-flip-lab",
    name: "Word Flip Lab",
    cardTitle: "WORD GAME",
    status: "coming-soon",
    category: "Word game",
    badge: "Coming soon",
    description: "Word game",
  },
  {
    key: "memory-pair-rush",
    name: "Memory Pair Rush",
    cardTitle: "MATCHING GAME",
    status: "coming-soon",
    category: "Puzzle game",
    badge: "Coming soon",
    description: "Matching game",
  },
];

export const getGameRoute = (gameKey) => `/games/${gameKey}`;
