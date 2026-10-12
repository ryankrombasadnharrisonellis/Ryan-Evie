"use client";
import { useEffect, useState, useTransition } from "react";
import { guessWord } from "@/app/play/actions";
import type { LetterResult } from "@/lib/words";

type Row = { word: string; result: LetterResult[] };

const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const COLOR: Record<LetterResult, string> = {
  correct: "bg-[#6BAA75] text-white border-[#6BAA75]",
  present: "bg-[#E2B84D] text-white border-[#E2B84D]",
  absent: "bg-muted/60 text-white border-transparent",
};

export default function WordGame({ rows, done, maxGuesses }: { rows: Row[]; done: boolean; maxGuesses: number }) {
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  useEffect(() => setTyped(""), [rows.length]);

  // Best known state per letter, for the keyboard colours
  const keyState: Record<string, LetterResult> = {};
  const rank = { absent: 0, present: 1, correct: 2 };
  for (const r of rows)
    r.word.split("").forEach((ch, i) => {
      const s = r.result[i];
      if (!keyState[ch] || rank[s] > rank[keyState[ch]]) keyState[ch] = s;
    });

  function press(k: string) {
    if (done || pending) return;
    setError(null);
    if (k === "enter") {
      if (typed.length !== 5) {
        setShake((s) => s + 1);
        return setError("Five letters, please.");
      }
      const word = typed;
      start(async () => {
        const r = await guessWord(word);
        if (!r.ok) {
          setError(r.error);
          setShake((s) => s + 1);
        }
      });
      return;
    }
    if (k === "back") return setTyped((t) => t.slice(0, -1));
    if (typed.length < 5) setTyped((t) => t + k);
  }

  // Physical keyboard support (handy on a laptop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") press("enter");
      else if (e.key === "Backspace") press("back");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const grid: { ch: string; cls: string }[][] = [];
  for (let i = 0; i < maxGuesses; i++) {
    if (i < rows.length) grid.push(rows[i].word.split("").map((ch, j) => ({ ch, cls: COLOR[rows[i].result[j]] })));
    else if (i === rows.length && !done)
      grid.push(Array.from({ length: 5 }, (_, j) => ({ ch: typed[j] ?? "", cls: typed[j] ? "border-ink/40" : "border-line" })));
    else grid.push(Array.from({ length: 5 }, () => ({ ch: "", cls: "border-line" })));
  }

  return (
    <div className="space-y-4">
      <style>{`@keyframes re-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}`}</style>
      <div className="mx-auto grid max-w-[320px] gap-1.5">
        {grid.map((row, i) => (
          <div
            key={i === rows.length ? `cur-${shake}` : i}
            className="grid grid-cols-5 gap-1.5"
            style={i === rows.length && shake ? { animation: "re-shake .5s" } : undefined}
          >
            {row.map((c, j) => (
              <div key={j} className={`flex aspect-square items-center justify-center rounded-xl border-2 font-display text-2xl font-semibold uppercase ${c.cls}`}>
                {c.ch}
              </div>
            ))}
          </div>
        ))}
      </div>

      {error && <p className="text-center text-sm text-rose">{error}</p>}

      {!done && (
        <div className="space-y-1.5">
          {KEYS.map((row, i) => (
            <div key={row} className="flex justify-center gap-1">
              {i === 2 && (
                <button onClick={() => press("enter")} className="h-12 rounded-lg bg-line px-2 text-xs font-bold" disabled={pending}>
                  {pending ? "…" : "ENTER"}
                </button>
              )}
              {row.split("").map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className={`h-12 w-[8.5%] min-w-[26px] rounded-lg text-sm font-bold uppercase active:scale-95 ${keyState[k] ? COLOR[keyState[k]] : "bg-line"}`}
                >
                  {k}
                </button>
              ))}
              {i === 2 && (
                <button onClick={() => press("back")} className="h-12 rounded-lg bg-line px-3 text-sm font-bold">⌫</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
