"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { playMove, newBoardGame } from "@/app/play/actions";
import { C4_COLS, C4_ROWS, c4DropIndex, c4Winner, tttWinner, type Cell } from "@/lib/games";
import Confetti, { type ConfettiHandle } from "@/components/Confetti";

type Props = {
  gameId: string;
  type: "ttt" | "c4";
  board: Cell[];
  myMark: "X" | "O";
  myTurn: boolean;
  finished: boolean;
  iWon: boolean;
  theyWon: boolean;
  partnerName: string;
  last?: number;
};

function Piece({ mark, type }: { mark: Cell; type: "ttt" | "c4" }) {
  if (!mark) return null;
  if (type === "ttt") {
    return (
      <span className={`animate-pop font-display text-5xl font-semibold ${mark === "X" ? "text-rose" : "text-sky"}`}>
        {mark === "X" ? "✕" : "○"}
      </span>
    );
  }
  return <span className={`block h-[82%] w-[82%] animate-pop rounded-full shadow-inner ${mark === "X" ? "bg-rose" : "bg-[#F9D56E]"}`} />;
}

export default function BoardGame(p: Props) {
  const router = useRouter();
  const [board, setBoard] = useState<Cell[]>(p.board);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confetti = useRef<ConfettiHandle>(null);

  // Take the server's board whenever it changes (e.g. the other person moved).
  useEffect(() => setBoard(p.board), [p.board]);
  useEffect(() => {
    if (p.iWon) confetti.current?.fire();
  }, [p.iWon]);

  const win = p.type === "ttt" ? tttWinner(board) : c4Winner(board);
  const winLine = new Set(win?.line ?? []);
  const canPlay = p.myTurn && !p.finished && !pending;

  function move(index: number) {
    if (!canPlay) return;
    const next = [...board];
    const cell = p.type === "ttt" ? index : c4DropIndex(next, index);
    if (cell < 0 || next[cell]) return;
    next[cell] = p.myMark; // show it straight away
    setBoard(next);
    setError(null);
    start(async () => {
      const r = await playMove(p.gameId, index);
      if (!r.ok) {
        setBoard(p.board);
        setError(r.error);
      }
    });
  }

  function rematch() {
    start(async () => {
      const r = await newBoardGame(p.type);
      if (r.ok && r.id) router.push(`/play/${r.id}`);
    });
  }

  const status = p.finished
    ? p.iWon
      ? "You won! 🏆"
      : p.theyWon
        ? `${p.partnerName} won this one`
        : "It's a draw 🤝"
    : p.myTurn
      ? pending
        ? "Sending…"
        : "Your move"
      : `Waiting for ${p.partnerName}…`;

  return (
    <div className="space-y-4">
      <Confetti ref={confetti} />
      <div className="card flex items-center justify-between py-3">
        <p className={`font-display text-lg font-semibold ${p.myTurn && !p.finished ? "text-rose" : ""}`}>{status}</p>
        <p className="text-sm text-muted">
          You:{" "}
          {p.type === "ttt" ? (
            <b className={p.myMark === "X" ? "text-rose" : "text-sky"}>{p.myMark === "X" ? "✕" : "○"}</b>
          ) : (
            <span className={`inline-block h-3 w-3 rounded-full align-middle ${p.myMark === "X" ? "bg-rose" : "bg-[#F9D56E]"}`} />
          )}
        </p>
      </div>

      {p.type === "ttt" ? (
        <div className="card grid aspect-square grid-cols-3 gap-2 p-3">
          {board.map((m, i) => (
            <button
              key={i}
              onClick={() => move(i)}
              disabled={!canPlay || !!m}
              className={`flex items-center justify-center rounded-2xl transition ${winLine.has(i) ? "bg-rose/20" : "bg-line/50"} ${
                canPlay && !m ? "active:scale-95" : ""
              }`}
            >
              <Piece mark={m} type="ttt" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-sky/70 p-2 shadow-soft">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: C4_COLS }).map((_, c) => (
              <button
                key={c}
                onClick={() => move(c)}
                disabled={!canPlay || c4DropIndex(board, c) < 0}
                className="flex flex-col gap-1.5 rounded-xl transition active:bg-white/20"
                aria-label={`Drop in column ${c + 1}`}
              >
                {Array.from({ length: C4_ROWS }).map((_, r) => {
                  const i = r * C4_COLS + c;
                  return (
                    <span
                      key={r}
                      className={`flex aspect-square w-full items-center justify-center rounded-full bg-card ${
                        winLine.has(i) ? "ring-4 ring-white" : p.last === i ? "ring-2 ring-white/70" : ""
                      }`}
                    >
                      <Piece mark={board[i]} type="c4" />
                    </span>
                  );
                })}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-center text-sm text-rose">{error}</p>}
      {p.finished && (
        <button className="btn-primary w-full" onClick={rematch} disabled={pending}>
          {pending ? "Setting up…" : "Rematch 🔁"}
        </button>
      )}
    </div>
  );
}
