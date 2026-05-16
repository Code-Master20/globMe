import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { MdCasino, MdHistory, MdLogin, MdReplay, MdSportsEsports } from "react-icons/md";
import { toast } from "react-toastify";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import api from "../../lib/api";
import { AuthAccessPrompt } from "../../components/auth/AuthAccessPrompt";
import {
  DEFAULT_GAMES,
  getGameRoute,
  SNAKE_LADDER_GAME_KEY,
} from "../../components/games/gameCatalog";
import styles from "../../components/games/HomeGamesHub.module.css";

const BOARD_SIZE = 100;
const BOARD_COLUMNS = 10;

const wait = (duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

const waitForPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

const buildBoardCells = () => {
  const cells = [];
  const rows = BOARD_SIZE / BOARD_COLUMNS;

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowStart = BOARD_SIZE - rowIndex * BOARD_COLUMNS;
    const values = Array.from({ length: BOARD_COLUMNS }, (_, columnIndex) => rowStart - columnIndex);

    if (rowIndex % 2 === 1) {
      values.reverse();
    }

    cells.push(...values);
  }

  return cells;
};

const BOARD_CELLS = buildBoardCells();

const SNAKE_ROUTES = [
  {
    key: "snake-97-76",
    from: 97,
    to: 76,
    colorStart: "#fb7185",
    colorEnd: "#be123c",
    fromAnchor: { x: 0.5, y: 0.24 },
    toAnchor: { x: 0.5, y: 0.76 },
    waveCount: 2,
    amplitude: 18,
    phaseOffset: 0,
  },
  {
    key: "snake-88-24",
    from: 88,
    to: 24,
    colorStart: "#f97316",
    colorEnd: "#c2410c",
    fromAnchor: { x: 0.5, y: 0.22 },
    toAnchor: { x: 0.5, y: 0.78 },
    waveCount: 4,
    amplitude: 22,
    phaseOffset: 0.8,
  },
  {
    key: "snake-74-53",
    from: 74,
    to: 53,
    colorStart: "#22c55e",
    colorEnd: "#15803d",
    fromAnchor: { x: 0.5, y: 0.24 },
    toAnchor: { x: 0.5, y: 0.76 },
    waveCount: 2,
    amplitude: 18,
    phaseOffset: 1.1,
  },
  {
    key: "snake-62-41",
    from: 62,
    to: 41,
    colorStart: "#38bdf8",
    colorEnd: "#1d4ed8",
    fromAnchor: { x: 0.5, y: 0.24 },
    toAnchor: { x: 0.5, y: 0.76 },
    waveCount: 2,
    amplitude: 16,
    phaseOffset: 2.2,
  },
  {
    key: "snake-49-11",
    from: 49,
    to: 11,
    colorStart: "#a855f7",
    colorEnd: "#6d28d9",
    fromAnchor: { x: 0.5, y: 0.24 },
    toAnchor: { x: 0.5, y: 0.76 },
    waveCount: 4,
    amplitude: 20,
    phaseOffset: 0.45,
  },
];

const LADDER_ROUTES = [
  {
    key: "ladder-4-14",
    from: 4,
    to: 14,
    rail: "#8b5a2b",
    rung: "#d4a373",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
  {
    key: "ladder-9-31",
    from: 9,
    to: 31,
    rail: "#7c4a21",
    rung: "#c08457",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
  {
    key: "ladder-21-42",
    from: 21,
    to: 42,
    rail: "#8a5a31",
    rung: "#d0a06d",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
  {
    key: "ladder-28-55",
    from: 28,
    to: 55,
    rail: "#76411d",
    rung: "#bb7f4f",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
  {
    key: "ladder-36-58",
    from: 36,
    to: 58,
    rail: "#8b5a2b",
    rung: "#d4a373",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
  {
    key: "ladder-51-72",
    from: 51,
    to: 72,
    rail: "#7c4a21",
    rung: "#c08457",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
  {
    key: "ladder-71-92",
    from: 71,
    to: 92,
    rail: "#8a5a31",
    rung: "#d0a06d",
    fromAnchor: { x: 0.5, y: 0.78 },
    toAnchor: { x: 0.5, y: 0.24 },
  },
];

const SNAKES = SNAKE_ROUTES.reduce((accumulator, route) => {
  accumulator[route.from] = route.to;
  return accumulator;
}, {});

const LADDERS = LADDER_ROUTES.reduce((accumulator, route) => {
  accumulator[route.from] = route.to;
  return accumulator;
}, {});

const getBoardCellPoint = (stageMetrics, cell, anchor = { x: 0.5, y: 0.5 }) => {
  const cellMetrics = stageMetrics?.cells?.[cell];

  if (!cellMetrics) {
    return { x: 0, y: 0 };
  }

  return {
    x: cellMetrics.left + cellMetrics.width * anchor.x,
    y: cellMetrics.top + cellMetrics.height * anchor.y,
  };
};

const getResponsiveAnchorScale = (stageMetrics) => {
  const boardWidth = Number(stageMetrics?.width) || 0;

  if (boardWidth > 0 && boardWidth <= 360) {
    return 0.68;
  }

  if (boardWidth > 0 && boardWidth <= 460) {
    return 0.82;
  }

  return 1;
};

const getResponsiveCellAnchor = (anchor, stageMetrics) => {
  const normalizedAnchor = anchor || { x: 0.5, y: 0.5 };
  const scale = getResponsiveAnchorScale(stageMetrics);

  if (scale === 1) {
    return normalizedAnchor;
  }

  return {
    x: 0.5 + (normalizedAnchor.x - 0.5) * scale,
    y: 0.5 + (normalizedAnchor.y - 0.5) * scale,
  };
};

const getSnakeDirectionalAnchor = (stageMetrics, fromCell, toCell, endpoint) => {
  const boardWidth = Number(stageMetrics?.width) || 0;

  if (!boardWidth || boardWidth > 460) {
    return null;
  }

  const fromCellMetrics = stageMetrics?.cells?.[fromCell];
  const toCellMetrics = stageMetrics?.cells?.[toCell];

  if (!fromCellMetrics || !toCellMetrics) {
    return null;
  }

  const fromCenter = {
    x: fromCellMetrics.left + fromCellMetrics.width / 2,
    y: fromCellMetrics.top + fromCellMetrics.height / 2,
  };
  const toCenter = {
    x: toCellMetrics.left + toCellMetrics.width / 2,
    y: toCellMetrics.top + toCellMetrics.height / 2,
  };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const length = Math.hypot(dx, dy);

  if (!length) {
    return null;
  }

  const anchorOffset = boardWidth <= 360 ? 0.2 : 0.17;
  const directionX = dx / length;
  const directionY = dy / length;
  const directionMultiplier = endpoint === "from" ? 1 : -1;

  return {
    x: Math.min(0.8, Math.max(0.2, 0.5 + directionX * anchorOffset * directionMultiplier)),
    y: Math.min(0.8, Math.max(0.2, 0.5 + directionY * anchorOffset * directionMultiplier)),
  };
};

const buildLadderGeometry = (route, stageMetrics) => {
  const from = getBoardCellPoint(
    stageMetrics,
    route.from,
    getResponsiveCellAnchor(route.fromAnchor, stageMetrics),
  );
  const to = getBoardCellPoint(
    stageMetrics,
    route.to,
    getResponsiveCellAnchor(route.toAnchor, stageMetrics),
  );
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (!length) {
    return null;
  }

  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const railOffset = 11 * getLadderRailOffsetScale(stageMetrics);
  const inset = 10;
  const rungCount = Math.max(4, Math.floor(length / 48));
  const rungSpacing = (length - inset * 2) / rungCount;

  const railOneStart = {
    x: from.x + normalX * railOffset,
    y: from.y + normalY * railOffset,
  };
  const railOneEnd = {
    x: to.x + normalX * railOffset,
    y: to.y + normalY * railOffset,
  };
  const railTwoStart = {
    x: from.x - normalX * railOffset,
    y: from.y - normalY * railOffset,
  };
  const railTwoEnd = {
    x: to.x - normalX * railOffset,
    y: to.y - normalY * railOffset,
  };

  const rungs = Array.from({ length: rungCount + 1 }, (_, index) => {
    const distance = inset + rungSpacing * index;
    const centerX = from.x + unitX * distance;
    const centerY = from.y + unitY * distance;

    return {
      x1: centerX + normalX * railOffset,
      y1: centerY + normalY * railOffset,
      x2: centerX - normalX * railOffset,
      y2: centerY - normalY * railOffset,
    };
  });

  return {
    railOneStart,
    railOneEnd,
    railTwoStart,
    railTwoEnd,
    rungs,
  };
};

const buildSnakeGeometry = (route, stageMetrics) => {
  const fromAnchor =
    getSnakeDirectionalAnchor(stageMetrics, route.from, route.to, "from") ||
    getResponsiveCellAnchor(route.fromAnchor, stageMetrics);
  const toAnchor =
    getSnakeDirectionalAnchor(stageMetrics, route.from, route.to, "to") ||
    getResponsiveCellAnchor(route.toAnchor, stageMetrics);
  const from = getBoardCellPoint(
    stageMetrics,
    route.from,
    fromAnchor,
  );
  const to = getBoardCellPoint(
    stageMetrics,
    route.to,
    toAnchor,
  );
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (!length) {
    return null;
  }

  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const waveCount = route.waveCount || 2;
  const amplitude = route.amplitude || 32;
  const phaseOffset = route.phaseOffset || 0;
  const segmentCount = waveCount * 2 + 2;
  const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const t = index / segmentCount;
    const sine =
      index === 0 || index === segmentCount
        ? 0
        : Math.sin(t * Math.PI * waveCount + phaseOffset) * amplitude;

    return {
      x: from.x + dx * t + normalX * sine,
      y: from.y + dy * t + normalY * sine,
    };
  });

  const path = points.reduce((accumulator, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    const midY = (previous.y + point.y) / 2;

    return `${accumulator} Q ${previous.x} ${previous.y}, ${midX} ${midY}`;
  }, "");
  const lastPoint = points.at(-1);
  const secondLastPoint = points.at(-2);
  const neckPoint = points[1] || from;
  const headAngle =
    Math.atan2(neckPoint.y - from.y, neckPoint.x - from.x) * (180 / Math.PI);
  const tailAngle =
    secondLastPoint && lastPoint
      ? Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x) *
        (180 / Math.PI)
      : 0;

  return {
    from,
    to,
    path: `${path} T ${to.x} ${to.y}`,
    headAngle,
    tailAngle,
  };
};

const getSnakeHeadScale = (stageMetrics) => {
  const boardWidth = Number(stageMetrics?.width) || 0;

  if (boardWidth > 0 && boardWidth <= 360) {
    return 0.72;
  }

  if (boardWidth > 0 && boardWidth <= 460) {
    return 0.84;
  }

  return 1;
};

const getSnakeStrokeScale = (stageMetrics) => {
  const boardWidth = Number(stageMetrics?.width) || 0;

  if (boardWidth > 0 && boardWidth <= 360) {
    return 0.7;
  }

  if (boardWidth > 0 && boardWidth <= 460) {
    return 0.82;
  }

  return 1;
};

const getLadderStrokeScale = (stageMetrics) => {
  const boardWidth = Number(stageMetrics?.width) || 0;

  if (boardWidth > 0 && boardWidth <= 360) {
    return 0.58;
  }

  if (boardWidth > 0 && boardWidth <= 460) {
    return 0.7;
  }

  return 1;
};

const getLadderRailOffsetScale = (stageMetrics) => {
  const boardWidth = Number(stageMetrics?.width) || 0;

  if (boardWidth > 0 && boardWidth <= 360) {
    return 0.68;
  }

  if (boardWidth > 0 && boardWidth <= 460) {
    return 0.8;
  }

  return 1;
};

const BoardSnakesOverlay = ({ stageMetrics }) => {
  if (!stageMetrics.width || !stageMetrics.height) {
    return null;
  }

  return (
  <svg
    viewBox={`0 0 ${stageMetrics.width} ${stageMetrics.height}`}
    className={styles.boardOverlay}
    aria-hidden="true"
  >
    <defs>
      {SNAKE_ROUTES.map((snake) => (
        <linearGradient
          key={`${snake.key}-gradient`}
          id={`${snake.key}-gradient`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={snake.colorStart} />
          <stop offset="100%" stopColor={snake.colorEnd} />
        </linearGradient>
      ))}
      <filter id="snake-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.12" />
      </filter>
      <filter id="ladder-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.12" />
      </filter>
    </defs>

    {LADDER_ROUTES.map((ladder) => {
      const geometry = buildLadderGeometry(ladder, stageMetrics);

      if (!geometry) {
        return null;
      }

      const ladderStrokeScale = getLadderStrokeScale(stageMetrics);

      return (
        <g key={ladder.key} filter="url(#ladder-shadow)" opacity="0.95">
          <line
            x1={geometry.railOneStart.x}
            y1={geometry.railOneStart.y}
            x2={geometry.railOneEnd.x}
            y2={geometry.railOneEnd.y}
            stroke={ladder.rail}
            strokeWidth={4.5 * ladderStrokeScale}
            strokeLinecap="round"
          />
          <line
            x1={geometry.railTwoStart.x}
            y1={geometry.railTwoStart.y}
            x2={geometry.railTwoEnd.x}
            y2={geometry.railTwoEnd.y}
            stroke={ladder.rail}
            strokeWidth={4.5 * ladderStrokeScale}
            strokeLinecap="round"
          />
          {geometry.rungs.map((rung, index) => (
            <line
              key={`${ladder.key}-rung-${index}`}
              x1={rung.x1}
              y1={rung.y1}
              x2={rung.x2}
              y2={rung.y2}
              stroke={ladder.rung}
              strokeWidth={3.5 * ladderStrokeScale}
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    })}

    {SNAKE_ROUTES.map((snake) => {
      const geometry = buildSnakeGeometry(snake, stageMetrics);

      if (!geometry) {
        return null;
      }

      const headScale = getSnakeHeadScale(stageMetrics);
      const strokeScale = getSnakeStrokeScale(stageMetrics);

      return (
        <g key={snake.key} filter="url(#snake-shadow)">
          <path
            d={geometry.path}
            fill="none"
            stroke={`url(#${snake.key}-gradient)`}
            strokeWidth={10 * strokeScale}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <path
            d={geometry.path}
            fill="none"
            stroke="rgba(255,255,255,0.36)"
            strokeWidth={2.2 * strokeScale}
            strokeLinecap="round"
            strokeDasharray="1 16"
            opacity="0.75"
          />
          <g
            transform={`translate(${geometry.from.x}, ${geometry.from.y}) rotate(${geometry.headAngle}) scale(${headScale})`}
          >
            <ellipse cx="0" cy="0" rx="10" ry="8.2" fill={snake.colorEnd} />
            <ellipse cx="4.2" cy="-1.2" rx="4.5" ry="3.5" fill={snake.colorStart} opacity="0.82" />
            <circle cx="4.2" cy="-2.6" r="1.2" fill="#0f172a" />
            <circle cx="4.2" cy="2.6" r="1.2" fill="#0f172a" />
            <path d="M 9.2 0 L 15.2 -1.8 L 15.2 1.8 Z" fill="#ef4444" />
          </g>
          <g transform={`translate(${geometry.to.x}, ${geometry.to.y}) rotate(${geometry.tailAngle})`}>
            <ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill={snake.colorStart} opacity="0.95" />
            <path d="M 5 0 L 11 -2.4 L 11 2.4 Z" fill={snake.colorStart} opacity="0.82" />
          </g>
        </g>
      );
    })}
  </svg>
  );
};

const formatHistoryTime = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const MODE_DEFINITIONS = [
  {
    id: "cpu-duel",
    label: "2 players",
    category: "computer",
    requireNames: false,
    players: [
      { slotId: "computer", defaultName: "C1", type: "computer" },
      { slotId: "you", defaultName: "You", type: "human", primary: true },
    ],
  },
  {
    id: "cpu-trio",
    label: "3 players",
    category: "computer",
    requireNames: false,
    players: [
      { slotId: "you", defaultName: "You", type: "human", primary: true },
      { slotId: "computer-1", defaultName: "C1", type: "computer" },
      { slotId: "computer-2", defaultName: "C2", type: "computer" },
    ],
  },
  {
    id: "cpu-quad",
    label: "4 players",
    category: "computer",
    requireNames: false,
    players: [
      { slotId: "you", defaultName: "You", type: "human", primary: true },
      { slotId: "computer-1", defaultName: "C1", type: "computer" },
      { slotId: "computer-2", defaultName: "C2", type: "computer" },
      { slotId: "computer-3", defaultName: "C3", type: "computer" },
    ],
  },
  {
    id: "real-duel",
    label: "2 players",
    category: "real",
    requireNames: true,
    players: [
      { slotId: "you", defaultName: "You", type: "human", primary: true },
      { slotId: "player-1", defaultName: "Player 1", type: "human" },
    ],
  },
  {
    id: "real-trio",
    label: "3 players",
    category: "real",
    requireNames: true,
    players: [
      { slotId: "you", defaultName: "You", type: "human", primary: true },
      { slotId: "player-1", defaultName: "Player 1", type: "human" },
      { slotId: "player-2", defaultName: "Player 2", type: "human" },
    ],
  },
  {
    id: "real-quad",
    label: "4 players",
    category: "real",
    requireNames: true,
    players: [
      { slotId: "you", defaultName: "You", type: "human", primary: true },
      { slotId: "player-1", defaultName: "Player 1", type: "human" },
      { slotId: "player-2", defaultName: "Player 2", type: "human" },
      { slotId: "player-3", defaultName: "Player 3", type: "human" },
    ],
  },
];

const TOKEN_COLORS = ["#0f172a", "#2563eb", "#dc2626", "#059669"];

const getModeById = (modeId) =>
  MODE_DEFINITIONS.find((mode) => mode.id === modeId) || MODE_DEFINITIONS[0];

const buildNameDrafts = (mode) =>
  mode.players.reduce((accumulator, player) => {
    accumulator[player.slotId] = mode.requireNames ? "" : player.defaultName;
    return accumulator;
  }, {});

const createPlayersFromMode = (mode, drafts = {}) =>
  mode.players.map((player, index) => ({
    id: `${mode.id}-${player.slotId}`,
    slotId: player.slotId,
    name: `${drafts[player.slotId] ?? player.defaultName}`.trim() || player.defaultName,
    type: player.type,
    primary: Boolean(player.primary),
    color: TOKEN_COLORS[index] || TOKEN_COLORS[TOKEN_COLORS.length - 1],
    position: 0,
    rolls: [],
    path: [0],
    snakesHit: 0,
    laddersHit: 0,
  }));

const getPlayerInitial = (name) => {
  const normalizedName = `${name ?? ""}`.trim();

  if (!normalizedName) {
    return "?";
  }

  if (/^c\d+$/i.test(normalizedName)) {
    return normalizedName.toUpperCase();
  }

  return normalizedName.charAt(0).toUpperCase();
};

const getRollFlashLabel = (player) => {
  if (!player) {
    return "Player";
  }

  if (player.type === "computer") {
    const slotMatch = `${player.slotId ?? ""}`.match(/computer(?:-(\d+))?/i);

    if (slotMatch) {
      const computerNumber = slotMatch[1] ? Number(slotMatch[1]) : 1;
      return `Computer ${computerNumber}`;
    }

    const nameMatch = `${player.name ?? ""}`.trim().match(/^c(\d+)$/i);

    if (nameMatch) {
      return `Computer ${nameMatch[1]}`;
    }

    return "Computer";
  }

  return player.name || "Player";
};

const getComputerPanelLabel = (player) => {
  if (!player) {
    return "Player";
  }

  if (player.type !== "computer") {
    return player.name || "Player";
  }

  const slotMatch = `${player.slotId ?? ""}`.match(/computer(?:-(\d+))?/i);

  if (slotMatch) {
    const computerNumber = slotMatch[1] ? Number(slotMatch[1]) : 1;
    return `computer-${computerNumber}`;
  }

  const nameMatch = `${player.name ?? ""}`.trim().match(/^c(\d+)$/i);

  if (nameMatch) {
    return `computer-${nameMatch[1]}`;
  }

  return "computer";
};

const getSetupMessage = (mode, drafts = {}) => {
  if (!mode.requireNames) {
    return "Mode selected. Start the game when you are ready.";
  }

  const missingName = mode.players.some(
    (player) => player.type === "human" && !`${drafts[player.slotId] ?? ""}`.trim(),
  );

  return missingName
    ? "Add each real player's name before starting the game."
    : "Names are ready. Start the game when you are ready.";
};

const getPlacementLabel = (placementIndex) => {
  if (placementIndex === 0) {
    return "First";
  }

  if (placementIndex === 1) {
    return "Second";
  }

  if (placementIndex === 2) {
    return "Third";
  }

  return `${placementIndex + 1}th`;
};

const getNextActivePlayerIndex = (players, currentIndex, finishOrderIds) => {
  if (!players.length) {
    return -1;
  }

  for (let offset = 1; offset <= players.length; offset += 1) {
    const nextIndex = (currentIndex + offset) % players.length;

    if (!finishOrderIds.includes(players[nextIndex].id)) {
      return nextIndex;
    }
  }

  return -1;
};

const getWinningPlacementsCount = (playerCount) => Math.max(1, playerCount - 1);

const SOUND_PRESETS = {
  tick: [
    { frequency: 760, duration: 0.035, type: "square", gain: 0.05 },
  ],
  snake: [
    { frequency: 430, duration: 0.12, type: "sawtooth", gain: 0.09 },
    { frequency: 280, duration: 0.16, type: "triangle", gain: 0.11 },
    { frequency: 180, duration: 0.24, type: "sine", gain: 0.13 },
  ],
  ladder: [
    { frequency: 420, duration: 0.1, type: "triangle", gain: 0.08 },
    { frequency: 560, duration: 0.1, type: "triangle", gain: 0.09 },
    { frequency: 720, duration: 0.16, type: "sine", gain: 0.11 },
  ],
  win: [
    { frequency: 523.25, duration: 0.11, type: "triangle", gain: 0.08 },
    { frequency: 659.25, duration: 0.11, type: "triangle", gain: 0.09 },
    { frequency: 783.99, duration: 0.14, type: "triangle", gain: 0.105 },
    { frequency: 1046.5, duration: 0.24, type: "sine", gain: 0.125 },
  ],
};

export const GameArena = () => {
  const { gameKey = SNAKE_LADDER_GAME_KEY } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [games, setGames] = useState(DEFAULT_GAMES);
  const [selectedModeId, setSelectedModeId] = useState(MODE_DEFINITIONS[0].id);
  const [playerNameDrafts, setPlayerNameDrafts] = useState(
    buildNameDrafts(MODE_DEFINITIONS[0]),
  );
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [finishOrder, setFinishOrder] = useState([]);
  const [diceValue, setDiceValue] = useState(null);
  const [turnCount, setTurnCount] = useState(0);
  const [statusText, setStatusText] = useState(
    "Choose a player mode, add names for real players, and start the game.",
  );
  const [moveLog, setMoveLog] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [rollFlash, setRollFlash] = useState(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [recentHistory, setRecentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [stageMetrics, setStageMetrics] = useState({
    width: 0,
    height: 0,
    cells: {},
  });

  const playersRef = useRef([]);
  const totalTurnRef = useRef(0);
  const sessionStartedAtRef = useRef(Date.now());
  const historySavedRef = useRef(false);
  const gameCardRef = useRef(null);
  const boardStageRef = useRef(null);
  const boardCellRefs = useRef(new Map());
  const audioContextRef = useRef(null);
  const rollFlashTimeoutRef = useRef(null);

  const activeGame = games.find((game) => game.key === gameKey) || null;
  const snakeGameActive = gameKey === SNAKE_LADDER_GAME_KEY;
  const selectedMode = getModeById(selectedModeId);
  const activePlayer = players[activePlayerIndex] || null;
  const turnHandoffDelay = selectedMode.category === "computer" ? 500 : 0;
  const finishOrderIds = finishOrder.map((entry) => entry.playerId);
  const winningPlacementsCount = getWinningPlacementsCount(players.length);
  const placementsComplete =
    players.length > 0 && finishOrder.length >= winningPlacementsCount;
  const activePlayerPosition = activePlayer?.position || 0;
  const shouldHideUpperContent = gameStarted;
  const missingRequiredNames = selectedMode.requireNames
    ? selectedMode.players.some(
        (player) => !`${playerNameDrafts[player.slotId] ?? ""}`.trim(),
      )
    : false;

  usePageMetadata({
    title: activeGame ? `${activeGame.name} | globMe` : "Games | globMe",
    description: activeGame?.description || "Play lightweight homepage games on globMe.",
  });

  const getReadyMessage = (nextPlayers) =>
    nextPlayers.length
      ? `${nextPlayers[0].name} starts the game. Roll when you are ready.`
      : "Choose a player mode, add names for real players, and start the game.";

  const focusBoardOnSmallScreen = ({ smooth = false } = {}) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.matchMedia("(max-width: 768px)").matches) {
      return;
    }

    const scrollTarget = boardStageRef.current || gameCardRef.current;

    if (!scrollTarget) {
      return;
    }

    const nextTop = scrollTarget.getBoundingClientRect().top + window.scrollY - 12;

    window.scrollTo({
      top: Math.max(0, nextTop),
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const pushMoveLog = (message) => {
    setMoveLog((previous) => [message, ...previous].slice(0, 6));
  };

  const getPlayerPlacementIndex = (playerId) =>
    finishOrder.findIndex((entry) => entry.playerId === playerId);

  const syncPlayers = (nextPlayers) => {
    playersRef.current = nextPlayers;
    setPlayers(nextPlayers);
  };

  const clearRoundState = (message, { startGame = false, nextPlayers = [] } = {}) => {
    if (rollFlashTimeoutRef.current) {
      window.clearTimeout(rollFlashTimeoutRef.current);
      rollFlashTimeoutRef.current = null;
    }

    syncPlayers(nextPlayers);
    setGameStarted(startGame);
    setActivePlayerIndex(0);
    setFinishOrder([]);
    setDiceValue(null);
    totalTurnRef.current = 0;
    setTurnCount(0);
    setMoveLog([]);
    setIsRolling(false);
    setRollFlash(null);
    sessionStartedAtRef.current = Date.now();
    historySavedRef.current = false;
    setStatusText(message);
  };

  const resetRound = (message) => {
    const nextPlayers = createPlayersFromMode(selectedMode, playerNameDrafts);

    clearRoundState(message || getReadyMessage(nextPlayers), {
      startGame: true,
      nextPlayers,
    });
  };

  const resetToBeginning = () => {
    clearRoundState(getSetupMessage(selectedMode, playerNameDrafts), {
      startGame: false,
      nextPlayers: [],
    });
  };

  const clearRollFlash = () => {
    if (rollFlashTimeoutRef.current) {
      window.clearTimeout(rollFlashTimeoutRef.current);
      rollFlashTimeoutRef.current = null;
    }

    setRollFlash(null);
  };

  const showRollFlash = (playerName, value) => {
    clearRollFlash();
    setRollFlash({
      playerName,
      value,
    });
  };

  const registerBoardCellRef = (cell) => (node) => {
    if (node) {
      boardCellRefs.current.set(cell, node);
      return;
    }

    boardCellRefs.current.delete(cell);
  };

  const getAudioContext = async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (_error) {
        return null;
      }
    }

    return audioContextRef.current;
  };

  const playEventSound = async (soundKey) => {
    const preset = SOUND_PRESETS[soundKey];

    if (!preset?.length) {
      return;
    }

    const audioContext = await getAudioContext();

    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;

    preset.reduce((offset, note) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startAt = now + offset;
      const stopAt = startAt + note.duration;

      oscillator.type = note.type || "sine";
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(note.gain || 0.03, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(stopAt);

      return offset + note.duration + 0.03;
    }, 0);
  };

  const handleModeChange = (modeId) => {
    const nextMode = getModeById(modeId);
    const nextDrafts = buildNameDrafts(nextMode);

    setSelectedModeId(modeId);
    setPlayerNameDrafts(nextDrafts);
    clearRoundState(getSetupMessage(nextMode, nextDrafts), {
      startGame: false,
      nextPlayers: [],
    });
  };

  const handleNameDraftChange = (slotId, value) => {
    setPlayerNameDrafts((previous) => ({
      ...previous,
      [slotId]: value,
    }));
  };

  useEffect(() => {
    let ignore = false;

    const loadGames = async () => {
      try {
        const response = await api.get("/public/games");
        const nextGames = Array.isArray(response.data?.data) && response.data.data.length
          ? response.data.data
          : DEFAULT_GAMES;

        if (!ignore) {
          setGames(nextGames);
        }
      } catch (_error) {
        if (!ignore) {
          setGames(DEFAULT_GAMES);
        }
      }
    };

    loadGames();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!snakeGameActive) {
      setRecentHistory([]);
      setHistoryLoading(false);
      return;
    }

    let ignore = false;

    const run = async () => {
      if (!isAuthenticated) {
        setRecentHistory([]);
        setHistoryLoading(false);
        return;
      }

      try {
        setHistoryLoading(true);
        const response = await api.get("/user/game-history", {
          params: {
            gameKey: SNAKE_LADDER_GAME_KEY,
            limit: 5,
          },
        });

        if (!ignore) {
          setRecentHistory(Array.isArray(response.data?.data) ? response.data.data : []);
        }
      } catch (_error) {
        if (!ignore) {
          setRecentHistory([]);
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, snakeGameActive]);

  useEffect(() => {
    if (snakeGameActive) {
      syncPlayers([]);
      setGameStarted(false);
      setFinishOrder([]);
      setDiceValue(null);
      totalTurnRef.current = 0;
      setTurnCount(0);
      setMoveLog([]);
      setIsRolling(false);
      setStatusText("Choose a player mode, add names for real players, and start the game.");
    }
  }, [gameKey, snakeGameActive]);

  useEffect(() => {
    const measureBoardStage = () => {
      const stageNode = boardStageRef.current;

      if (!stageNode) {
        return;
      }

      const stageRect = stageNode.getBoundingClientRect();
      const cells = {};

      BOARD_CELLS.forEach((cell) => {
        const cellNode = boardCellRefs.current.get(cell);

        if (!cellNode) {
          return;
        }

        const cellRect = cellNode.getBoundingClientRect();
        cells[cell] = {
          left: cellRect.left - stageRect.left,
          top: cellRect.top - stageRect.top,
          width: cellRect.width,
          height: cellRect.height,
        };
      });

      setStageMetrics({
        width: stageRect.width,
        height: stageRect.height,
        cells,
      });
    };

    let frameId = 0;
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measureBoardStage);
    };

    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
          scheduleMeasure();
        })
        : null;

    if (resizeObserver && boardStageRef.current) {
      resizeObserver.observe(boardStageRef.current);
      boardCellRefs.current.forEach((node) => resizeObserver.observe(node));
    }

    return () => {
      window.removeEventListener("resize", scheduleMeasure);
      window.cancelAnimationFrame(frameId);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [snakeGameActive]);

  useEffect(() => {
    if (activeGame || games.length === 0) {
      return;
    }

    navigate(getGameRoute(games[0].key), { replace: true });
  }, [activeGame, games, navigate]);

  useEffect(
    () => () => {
      if (rollFlashTimeoutRef.current) {
        window.clearTimeout(rollFlashTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!shouldHideUpperContent || typeof window === "undefined") {
      return;
    }

    if (!window.matchMedia("(max-width: 768px)").matches) {
      return;
    }

    const scrollTarget = boardStageRef.current || gameCardRef.current;

    if (!scrollTarget) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextTop = scrollTarget.getBoundingClientRect().top + window.scrollY - 12;

      window.scrollTo({
        top: Math.max(0, nextTop),
        behavior: "smooth",
      });
    }, 140);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shouldHideUpperContent]);

  useEffect(() => {
    if (
      !gameStarted ||
      !activePlayer ||
      activePlayer.type !== "computer" ||
      isRolling ||
      placementsComplete ||
      finishOrderIds.includes(activePlayer.id)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      handleRollDice();
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activePlayer, finishOrderIds, gameStarted, isRolling, placementsComplete]);

  const saveCompletedGame = async (finalPlayers, placedPlayer, placementIndex) => {
    if (!isAuthenticated || historySavedRef.current) {
      return;
    }

    const primaryPlayer = finalPlayers.find((player) => player.primary);

    if (!primaryPlayer || placedPlayer.id !== primaryPlayer.id) {
      return;
    }

    try {
      historySavedRef.current = true;
      setHistorySaving(true);
      const response = await api.post("/user/game-history", {
        gameKey: SNAKE_LADDER_GAME_KEY,
        won: placementIndex === 0,
        boardSize: BOARD_SIZE,
        finalPosition: primaryPlayer.position,
        totalRolls: primaryPlayer.rolls.length,
        diceRolls: primaryPlayer.rolls,
        path: primaryPlayer.path,
        snakesHit: primaryPlayer.snakesHit,
        laddersHit: primaryPlayer.laddersHit,
        durationMs: Date.now() - sessionStartedAtRef.current,
      });
      const savedEntry = response.data?.data;

      if (savedEntry) {
        setRecentHistory((previous) => [savedEntry, ...previous].slice(0, 5));
      }
    } catch (error) {
      historySavedRef.current = false;
      toast.error(error.response?.data?.message || "Game history could not be saved");
    } finally {
      setHistorySaving(false);
    }
  };

  const handleStartGame = () => {
    if (missingRequiredNames) {
      toast.error("Add every real player's name before starting.");
      return;
    }

    resetRound();
    window.setTimeout(() => {
      focusBoardOnSmallScreen();
    }, 0);
  };

  const handleRollDice = async () => {
    if (
      isRolling ||
      !snakeGameActive ||
      !gameStarted ||
      !activePlayer ||
      placementsComplete ||
      finishOrderIds.includes(activePlayer.id)
    ) {
      return;
    }

    const rolledValue = Math.floor(Math.random() * 6) + 1;
    const nextPlayers = playersRef.current.map((player) => ({
      ...player,
      rolls: [...player.rolls],
      path: [...player.path],
    }));
    const player = nextPlayers[activePlayerIndex];
    const startingPosition = player.position;
    const nextTurn = totalTurnRef.current + 1;

    setIsRolling(true);
    setStatusText(`${player.name} is rolling the dice...`);
    focusBoardOnSmallScreen();
    await getAudioContext();

    for (let animationStep = 0; animationStep < 7; animationStep += 1) {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      await wait(85);
    }

    setDiceValue(rolledValue);
    showRollFlash(getRollFlashLabel(player), rolledValue);
    await wait(420);
    totalTurnRef.current = nextTurn;
    setTurnCount(nextTurn);
    player.rolls.push(rolledValue);

    if (startingPosition + rolledValue > BOARD_SIZE) {
      const stayMessage = `Turn ${nextTurn}: ${player.name} rolled ${rolledValue}, but needs an exact finish roll from square ${startingPosition}.`;
      player.path.push(startingPosition);
      syncPlayers(nextPlayers);
      await wait(180);
      clearRollFlash();
      const nextIndex = getNextActivePlayerIndex(nextPlayers, activePlayerIndex, finishOrderIds);
      setStatusText(
        nextIndex >= 0
          ? `${player.name} rolled ${rolledValue}. Exact finish needed. ${nextPlayers[nextIndex].name} is next.`
          : `${player.name} rolled ${rolledValue}. Exact finish needed.`,
      );
      pushMoveLog(stayMessage);
      if (nextIndex >= 0) {
        if (turnHandoffDelay > 0) {
          await wait(turnHandoffDelay);
        }
        setActivePlayerIndex(nextIndex);
      }
      setIsRolling(false);
      return;
    }

    setStatusText(`${player.name} rolled ${rolledValue}. Moving step by step...`);

    for (let nextPosition = startingPosition + 1; nextPosition <= startingPosition + rolledValue; nextPosition += 1) {
      player.position = nextPosition;
      syncPlayers(nextPlayers.map((entry) => ({ ...entry })));
      await waitForPaint();
      void playEventSound("tick");
      await wait(180);
    }

    let landingPosition = player.position;
    let moveMessage = `Turn ${nextTurn}: ${player.name} rolled ${rolledValue} and reached square ${landingPosition}.`;

    if (LADDERS[landingPosition]) {
      const ladderTarget = LADDERS[landingPosition];

      player.laddersHit += 1;
      setStatusText(`${player.name} climbed a ladder from ${landingPosition} to ${ladderTarget}.`);
      playEventSound("ladder");
      await wait(240);
      player.position = ladderTarget;
      landingPosition = ladderTarget;
      moveMessage = `Turn ${nextTurn}: ${player.name} rolled ${rolledValue}, climbed a ladder, and jumped to square ${landingPosition}.`;
    } else if (SNAKES[landingPosition]) {
      const snakeTarget = SNAKES[landingPosition];

      player.snakesHit += 1;
      setStatusText(`${player.name} hit a snake and slipped from ${landingPosition} to ${snakeTarget}.`);
      playEventSound("snake");
      await wait(240);
      player.position = snakeTarget;
      landingPosition = snakeTarget;
      moveMessage = `Turn ${nextTurn}: ${player.name} rolled ${rolledValue}, hit a snake, and slid to square ${landingPosition}.`;
    } else {
      setStatusText(`${player.name} is now on square ${landingPosition}.`);
    }

    player.path.push(landingPosition);
    syncPlayers(nextPlayers.map((entry) => ({ ...entry })));
    await wait(180);
    clearRollFlash();
    pushMoveLog(moveMessage);

    if (landingPosition === BOARD_SIZE) {
      const nextFinishOrder = [
        ...finishOrder,
        {
          playerId: player.id,
          name: player.name,
          placement: finishOrder.length,
        },
      ];
      setFinishOrder(nextFinishOrder);
      playEventSound("win");
      const placementLabel = getPlacementLabel(nextFinishOrder.length - 1).toLowerCase();
      const nextPlacementsComplete =
        nextFinishOrder.length >= getWinningPlacementsCount(nextPlayers.length);

      setStatusText(
        nextPlacementsComplete
          ? `${player.name} finished ${placementLabel}. Placements are decided.`
          : `${player.name} finished ${placementLabel}.`,
      );
      await saveCompletedGame(nextPlayers, player, nextFinishOrder.length - 1);
      syncPlayers(nextPlayers.map((entry) => ({ ...entry })));

      if (nextPlacementsComplete) {
        setStatusText(`${player.name} finished ${placementLabel}. Placements are decided.`);
        setIsRolling(false);
        return;
      }

      const nextIndex = getNextActivePlayerIndex(
        nextPlayers,
        activePlayerIndex,
        nextFinishOrder.map((entry) => entry.playerId),
      );

      if (nextIndex >= 0) {
        if (turnHandoffDelay > 0) {
          await wait(turnHandoffDelay);
        }
        setActivePlayerIndex(nextIndex);
        setStatusText(
          `${player.name} finished ${placementLabel}. ${nextPlayers[nextIndex].name} is next.`,
        );
      } else {
        setStatusText("All placements are decided.");
      }

      setIsRolling(false);
      return;
    }

    const nextIndex = getNextActivePlayerIndex(nextPlayers, activePlayerIndex, finishOrderIds);

    if (nextIndex >= 0) {
      if (turnHandoffDelay > 0) {
        await wait(turnHandoffDelay);
      }
      setActivePlayerIndex(nextIndex);
      setStatusText(`${player.name} finished on ${landingPosition}. ${nextPlayers[nextIndex].name} is next.`);
    } else {
      setStatusText(`${player.name} finished on ${landingPosition}.`);
    }
    setIsRolling(false);
  };

  const humanPlayersToName = selectedMode.players.filter((player) => player.type === "human");

  return (
    <>
      <section className={styles.shell}>
        <div
          className={`${styles.heroCopy} ${
            shouldHideUpperContent ? styles.playingFocusHidden : ""
          }`}
        >
          <h1>{activeGame?.name || "Play Zone"}</h1>
          <p>
            <NavLink to="/" className={styles.routeBackLink}>
              Back to homepage
            </NavLink>
            {" "}and choose any other game card whenever you want.
          </p>
        </div>

        <div
          className={`${styles.catalogGrid} ${styles.routeCatalogGrid} ${
            shouldHideUpperContent ? styles.playingFocusHidden : ""
          }`}
        >
          {games.map((game) => (
            <button
              key={game.key}
              type="button"
              className={`${styles.catalogCard} ${
                gameKey === game.key ? styles.catalogCardActive : ""
              }`}
              onClick={() => navigate(getGameRoute(game.key))}
            >
              {game.imageSrc ? (
                <div className={styles.catalogImageFrame}>
                  <img
                    src={game.imageSrc}
                    alt={game.imageAlt || game.name}
                    className={styles.catalogImage}
                  />
                </div>
              ) : null}
              <div className={styles.catalogHeader}>
                <span>{game.badge || "Game"}</span>
                <strong>{game.category || "Mini game"}</strong>
              </div>
              <h2>{game.name}</h2>
              <p>{game.description}</p>
            </button>
          ))}
        </div>

        {snakeGameActive ? (
          <div className={styles.gameCard} ref={gameCardRef}>
            <div className={styles.gameMain}>
              <div className={styles.gameIntro}>
                <div>
                  <p className={styles.panelKicker}>Game one</p>
                  <h2>{activeGame?.name || "Snake & Ladder Sprint"}</h2>
                </div>
                <div className={styles.rulePills}>
                  <span>{selectedMode.label}</span>
                  <span>Board {BOARD_SIZE}</span>
                  <span>Exact finish</span>
                  <span>{gameStarted ? `${players.length} players` : "Pick mode"}</span>
                </div>
              </div>

              <div className={styles.boardLayout}>
                <div
                  className={styles.boardStage}
                  ref={boardStageRef}
                  style={{
                    "--board-columns": BOARD_COLUMNS,
                    "--board-rows": BOARD_SIZE / BOARD_COLUMNS,
                    "--board-gap": "clamp(0.18rem, 0.7vw, 0.35rem)",
                  }}
                >
                  <div className={styles.boardBaseGrid}>
                    {BOARD_CELLS.map((cell) => {
                      const hasSnake = Object.prototype.hasOwnProperty.call(SNAKES, cell);
                      const hasLadder = Object.prototype.hasOwnProperty.call(LADDERS, cell);

                      return (
                        <div
                          key={`base-${cell}`}
                          ref={registerBoardCellRef(cell)}
                          className={`${styles.boardCell} ${
                            activePlayerPosition === cell ? styles.boardCellActive : ""
                          } ${hasSnake ? styles.boardCellSnake : ""} ${
                            hasLadder ? styles.boardCellLadder : ""
                          } ${cell === BOARD_SIZE ? styles.boardCellFinish : ""}`}
                        />
                      );
                    })}
                  </div>
                  <BoardSnakesOverlay stageMetrics={stageMetrics} />
                  {rollFlash ? (
                    <div className={styles.rollFlash} aria-live="polite">
                      <small>{rollFlash.playerName} got</small>
                      <strong>{rollFlash.value}</strong>
                    </div>
                  ) : null}
                  <div className={styles.boardContentGrid}>
                    {BOARD_CELLS.map((cell) => {
                      const hasSnake = Object.prototype.hasOwnProperty.call(SNAKES, cell);
                      const hasLadder = Object.prototype.hasOwnProperty.call(LADDERS, cell);

                      return (
                        <div
                          key={cell}
                          className={styles.boardCellContent}
                        >
                          <span className={styles.cellNumber}>{cell}</span>
                          {gameStarted ? (
                            <div className={styles.tokenStack}>
                              {players
                                .filter((player) => player.position === cell)
                                .map((player, stackIndex) => (
                                  <span
                                    key={player.id}
                                    className={`${styles.tokenBadge} ${
                                      finishOrderIds.includes(player.id) ? styles.tokenBadgeWinner : ""
                                    }`}
                                    style={{ backgroundColor: player.color }}
                                    data-stack-index={stackIndex}
                                    title={player.name}
                                  >
                                    {getPlayerInitial(player.name)}
                                  </span>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.controlPanel}>
                  {!gameStarted ? (
                    <div className={styles.setupPanel}>
                      <div className={styles.modeGroup}>
                        <p className={styles.panelKicker}>Computer mode</p>
                        <div className={styles.modeGrid}>
                          {MODE_DEFINITIONS.filter((mode) => mode.category === "computer").map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              className={`${styles.modeCard} ${
                                selectedModeId === mode.id ? styles.modeCardActive : ""
                              }`}
                              onClick={() => handleModeChange(mode.id)}
                            >
                              <strong>{mode.label}</strong>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.modeGroup}>
                        <p className={styles.panelKicker}>Real player mode</p>
                        <div className={styles.modeGrid}>
                          {MODE_DEFINITIONS.filter((mode) => mode.category === "real").map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              className={`${styles.modeCard} ${
                                selectedModeId === mode.id ? styles.modeCardActive : ""
                              }`}
                              onClick={() => handleModeChange(mode.id)}
                            >
                              <strong>{mode.label}</strong>
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedMode.requireNames ? (
                        <div className={styles.setupFieldGrid}>
                          {humanPlayersToName.map((player) => (
                            <label key={player.slotId} className={styles.setupField}>
                              <span>{player.defaultName} name</span>
                              <input
                                type="text"
                                value={playerNameDrafts[player.slotId] || ""}
                                onChange={(event) =>
                                  handleNameDraftChange(player.slotId, event.target.value)
                                }
                                placeholder={`Add ${player.defaultName.toLowerCase()} name`}
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={handleStartGame}
                        disabled={missingRequiredNames}
                      >
                        <MdCasino />
                        Start game
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.diceDisplay}>
                        <span>
                          {placementsComplete
                            ? "Placements"
                            : getComputerPanelLabel(activePlayer) || "Latest roll"}
                        </span>
                        <strong>{placementsComplete ? finishOrder.length : diceValue ?? "-"}</strong>
                        <div className={styles.mobileDiceStats}>
                          <article>
                            <span>Turn</span>
                            <strong>{turnCount}</strong>
                          </article>
                          <article>
                            <span>Active</span>
                            <strong>{getComputerPanelLabel(activePlayer) || "-"}</strong>
                          </article>
                          <article>
                            <span>Position</span>
                            <strong>{activePlayer?.position || 0}</strong>
                          </article>
                          <article>
                            <span>Type</span>
                            <strong>{activePlayer?.type === "computer" ? "CPU" : "Human"}</strong>
                          </article>
                        </div>
                      </div>

                      <div className={styles.statStrip}>
                        <article>
                          <span>Turn</span>
                          <strong>{turnCount}</strong>
                        </article>
                        <article>
                          <span>Active</span>
                          <strong>{activePlayer?.name || "-"}</strong>
                        </article>
                        <article>
                          <span>Position</span>
                          <strong>{activePlayer?.position || 0}</strong>
                        </article>
                        <article>
                          <span>Type</span>
                          <strong>{activePlayer?.type === "computer" ? "CPU" : "Human"}</strong>
                        </article>
                      </div>

                      <div className={styles.rosterPanel}>
                        {players.map((player, index) => (
                            <article
                              key={player.id}
                              className={`${styles.rosterCard} ${
                              index === activePlayerIndex && !placementsComplete && !finishOrderIds.includes(player.id) ? styles.rosterCardActive : ""
                            } ${finishOrderIds.includes(player.id) ? styles.rosterCardWinner : ""}`}
                            >
                              <div className={styles.rosterIdentity}>
                                <span
                                className={styles.tokenBadge}
                                style={{ backgroundColor: player.color }}
                              >
                                {getPlayerInitial(player.name)}
                              </span>
                                <div>
                                  <strong>{player.name}</strong>
                                  <small>
                                    {player.type === "computer" ? "Computer" : "Player"} | Square {player.position}
                                  </small>
                                  {getPlayerPlacementIndex(player.id) >= 0 ? (
                                    <small>{getPlacementLabel(getPlayerPlacementIndex(player.id))}</small>
                                  ) : null}
                                </div>
                              </div>
                            <small>
                              Snakes {player.snakesHit} | Ladders {player.laddersHit}
                            </small>
                          </article>
                        ))}
                      </div>

                      <div className={styles.statusPanel}>
                        <p>{statusText}</p>
                      </div>

                      <div className={styles.actionRow}>
                        <button
                          type="button"
                          className={styles.primaryAction}
                          onClick={handleRollDice}
                          disabled={isRolling || placementsComplete || activePlayer?.type === "computer"}
                        >
                          <MdCasino />
                          {placementsComplete
                            ? "Finished"
                            : isRolling
                              ? "Rolling..."
                              : activePlayer?.type === "computer"
                                ? "Computer playing..."
                                : `Roll for ${activePlayer?.name || "player"}`}
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryAction}
                          onClick={resetToBeginning}
                          disabled={isRolling}
                        >
                          <MdReplay />
                          Reset
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>

            <aside className={styles.historyCard}>
              <div className={styles.historyHeader}>
                <div>
                  <p className={styles.panelKicker}>History</p>
                  <h3>Saved wins</h3>
                </div>
                <MdHistory />
              </div>

              {isAuthenticated ? (
                <>
                  <p className={styles.historyIntro}>
                    {user?.username
                      ? `${user.username}, your completed Snake & Ladder runs are stored here.`
                      : "Completed Snake & Ladder runs are stored here for your account."}
                  </p>

                  {historySaving ? (
                    <div className={styles.historyNotice}>Saving your fresh win...</div>
                  ) : null}

                  {historyLoading ? (
                    <div className={styles.historyNotice}>Loading your saved rounds...</div>
                  ) : recentHistory.length === 0 ? (
                    <div className={styles.historyNotice}>
                      Win your first round and it will appear here automatically.
                    </div>
                  ) : (
                    <div className={styles.historyList}>
                      {recentHistory.map((entry) => (
                        <article key={entry._id} className={styles.historyItem}>
                          <strong>{entry.won ? "Win saved" : "Round saved"}</strong>
                          <span>
                            Square {entry.finalPosition} in {entry.totalRolls} rolls
                          </span>
                          <small>
                            Ladders {entry.laddersHit} | Snakes {entry.snakesHit}
                          </small>
                          <small>{formatHistoryTime(entry.createdAt)}</small>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className={styles.historyIntro}>
                    Guests can play freely, but history is reserved for signed-in members.
                  </p>
                  <button
                    type="button"
                    className={styles.loginAction}
                    onClick={() => setShowAuthPrompt(true)}
                  >
                    <MdLogin />
                    Log in to save wins
                  </button>
                </>
              )}
            </aside>
          </div>
        ) : (
          <div className={styles.comingSoonPanel}>
            <MdSportsEsports />
            <div>
              <p className={styles.panelKicker}>{activeGame?.badge || "Coming soon"}</p>
              <h2>{activeGame?.name || "More games are on the way"}</h2>
              <p>
                {activeGame?.description ||
                  "This slot is reserved for the next homepage mini game."}
              </p>
            </div>
          </div>
        )}
      </section>

      <AuthAccessPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Log in to save your game wins"
        description="Guests can keep playing right now. Sign in only when you want your completed rounds stored in account history."
      />
    </>
  );
};
