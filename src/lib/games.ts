// Pure game rules — shared by the server (which enforces them) and the screens.

export type GameType = "ttt" | "c4" | "draw" | "quiz";

export const GAME_INFO: Record<GameType | "word", { name: string; emoji: string }> = {
  ttt: { name: "Tic-tac-toe", emoji: "❌" },
  c4: { name: "Connect 4", emoji: "🔴" },
  draw: { name: "Draw & guess", emoji: "✏️" },
  quiz: { name: "How well do you know me?", emoji: "🧠" },
  word: { name: "Daily word", emoji: "🟩" },
};

export type Cell = "X" | "O" | null;

// ---------- Tic-tac-toe ----------
export type TttState = { board: Cell[]; marks: Record<string, "X" | "O"> };

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function tttWinner(board: Cell[]): { mark: "X" | "O"; line: number[] } | null {
  for (const line of TTT_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { mark: board[a] as "X" | "O", line };
  }
  return null;
}

// ---------- Connect 4 ----------
export const C4_ROWS = 6;
export const C4_COLS = 7;
export type C4State = { board: Cell[]; marks: Record<string, "X" | "O">; last?: number };

/** Index of the cell a piece lands in when dropped in `col`, or -1 if the column is full. */
export function c4DropIndex(board: Cell[], col: number) {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    const i = r * C4_COLS + col;
    if (!board[i]) return i;
  }
  return -1;
}

export function c4Winner(board: Cell[]): { mark: "X" | "O"; line: number[] } | null {
  const dirs = [
    [0, 1], [1, 0], [1, 1], [1, -1],
  ];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const m = board[r * C4_COLS + c];
      if (!m) continue;
      for (const [dr, dc] of dirs) {
        const line = [r * C4_COLS + c];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= C4_ROWS || cc < 0 || cc >= C4_COLS || board[rr * C4_COLS + cc] !== m) break;
          line.push(rr * C4_COLS + cc);
        }
        if (line.length === 4) return { mark: m, line };
      }
    }
  }
  return null;
}

// ---------- Draw & guess ----------
export type DrawState = {
  phase: "drawing" | "guessing";
  image?: string; // JPEG data URL
  guesses: string[];
  word?: string; // revealed once finished
};
export const DRAW_MAX_GUESSES = 3;

export function normaliseGuess(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

// ---------- How well do you know me ----------
export type QuizQuestion = { q: string; options: string[] };
export type QuizState = {
  questions: QuizQuestion[];
  answers?: number[];
  correct?: number[]; // revealed once finished
  score?: number;
};
/** The guesser wins with at least this share right; otherwise the quiz-writer "stumped" them. */
export const QUIZ_PASS = 0.6;
