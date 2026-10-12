"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { newBoardGame, newDrawGame } from "@/app/play/actions";

export default function NewGameButtons() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function go(key: string, fn: () => Promise<{ ok: boolean; id?: string; error?: string }>) {
    setWhich(key);
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.ok && r.id) router.push(`/play/${r.id}`);
      else setError(r.error ?? "Couldn't start a game.");
    });
  }

  const btn = "flex flex-col items-center gap-1 rounded-3xl bg-line/50 px-2 py-4 text-sm font-semibold transition active:scale-95 disabled:opacity-50";
  return (
    <section className="card space-y-3">
      <h2 className="font-display text-xl font-semibold">Start a game</h2>
      <div className="grid grid-cols-2 gap-2">
        <button className={btn} disabled={pending} onClick={() => go("ttt", () => newBoardGame("ttt"))}>
          <span className="text-3xl">❌⭕</span>
          {pending && which === "ttt" ? "Starting…" : "Tic-tac-toe"}
        </button>
        <button className={btn} disabled={pending} onClick={() => go("c4", () => newBoardGame("c4"))}>
          <span className="text-3xl">🔴🟡</span>
          {pending && which === "c4" ? "Starting…" : "Connect 4"}
        </button>
        <button className={btn} disabled={pending} onClick={() => go("draw", () => newDrawGame())}>
          <span className="text-3xl">✏️</span>
          {pending && which === "draw" ? "Starting…" : "Draw & guess"}
        </button>
        <Link href="/play/quiz/new" className={btn}>
          <span className="text-3xl">🧠</span>
          Quiz about me
        </Link>
      </div>
      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </section>
  );
}
