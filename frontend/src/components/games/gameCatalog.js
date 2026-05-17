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
    cardTitle: "WORD CORRECTION GAME",
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

const DEFAULT_GAMES_BY_KEY = new Map(DEFAULT_GAMES.map((game) => [game.key, game]));

export const normalizePublicGames = (games) => {
  if (!Array.isArray(games) || games.length === 0) {
    return DEFAULT_GAMES;
  }

  return games.map((game) => {
    const fallbackGame = DEFAULT_GAMES_BY_KEY.get(game?.key);

    if (!fallbackGame) {
      return game;
    }

    return {
      ...game,
      name: fallbackGame.name,
      cardTitle: fallbackGame.cardTitle,
      description: fallbackGame.description,
      category: fallbackGame.category,
      badge: fallbackGame.badge,
    };
  });
};

export const getGameRoute = (gameKey) => `/games/${gameKey}`;
