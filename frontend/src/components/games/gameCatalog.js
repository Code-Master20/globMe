import realSnakeImage from "../../assets/games/real-snake.jpg";

export const SNAKE_LADDER_GAME_KEY = "snake-ladder-sprint";

export const DEFAULT_GAMES = [
  {
    key: SNAKE_LADDER_GAME_KEY,
    name: "Snake & Ladder Sprint",
    status: "available",
    category: "Board game",
    badge: "Live now",
    boardSize: 100,
    historyEnabled: true,
    imageSrc: realSnakeImage,
    imageAlt: "Real snake coiled on a branch",
    description:
      "Roll the dice on a full 1 to 100 board and try to finish on the final square with an exact roll.",
  },
  {
    key: "word-flip-lab",
    name: "Word Flip Lab",
    status: "coming-soon",
    category: "Word game",
    badge: "Coming soon",
    description: "Quick guest word rounds are planned for the next update.",
  },
  {
    key: "memory-pair-rush",
    name: "Memory Pair Rush",
    status: "coming-soon",
    category: "Puzzle game",
    badge: "Coming soon",
    description: "Fast card matching is reserved for the next expansion of the play zone.",
  },
];

export const getGameRoute = (gameKey) => `/games/${gameKey}`;
