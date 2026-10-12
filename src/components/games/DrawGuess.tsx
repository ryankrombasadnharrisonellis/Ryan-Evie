"use client";
import { useState, useTransition } from "react";
import { guessDrawing } from "@/app/play/actions";
import { DRAW_MAX_GUESSES } from "@/lib/games";

export default function DrawGuess({ gameId, image, guesses, partnerName }: { gameId: string; image: string; guesses: string[]; partnerName: string }) {
  const [guess, setGuess] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const left = DRAW_MAX_GUESSES - guesses.length;

  function submit() {
    start(async () => {
      const r = await guessDrawing(gameId, guess);
      if (!r.ok) setMsg(r.error);
      else setGuess("");
    });
  }

  return (
    <div className="space-y-3">
      <div className="card py-3">
        <p className="font-display text-lg font-semibold">What did {partnerName} draw?</p>
        <p className="text-sm text-muted">{left} guess{left === 1 ? "" : "es"} left</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="Drawing" className="aspect-square w-full rounded-3xl border border-line bg-white shadow-soft" />
      {guesses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {guesses.map((g, i) => (
            <span key={i} className="rounded-full bg-line/60 px-3 py-1 text-sm line-through decoration-rose">{g}</span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Your guess…"
          value={guess}
          maxLength={40}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && guess.trim() && submit()}
        />
        <button className="btn-primary shrink-0" disabled={pending || !guess.trim()} onClick={submit}>
          {pending ? "…" : "Guess"}
        </button>
      </div>
      {msg && <p className="text-center text-sm text-rose">{msg}</p>}
    </div>
  );
}
