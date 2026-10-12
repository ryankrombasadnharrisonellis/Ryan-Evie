"use client";
import { useState, useTransition } from "react";
import { setMood } from "@/app/actions";
import { timeAgo } from "@/lib/time";

const MOODS = ["🥰", "😊", "😌", "😴", "🥺", "😔", "😤", "🤒", "🥳", "😂", "🤯", "☕"];

type Mood = { emoji: string; note: string | null; created_at: string } | null;

export default function MoodCard({ partnerName, partnerMood, myMood }: { partnerName: string; partnerMood: Mood; myMood: Mood }) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!emoji) return;
    start(async () => {
      const r = await setMood(emoji, note);
      if (!r.ok) return setError(r.error);
      setOpen(false);
      setEmoji(null);
      setNote("");
    });
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-line/50 text-4xl">
          {partnerMood?.emoji ?? "🫥"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{partnerName} is feeling</p>
          {partnerMood ? (
            <>
              <p className="break-words font-display text-lg font-semibold leading-snug">
                {partnerMood.note || "—"}
              </p>
              <p className="text-xs text-muted">{timeAgo(new Date(partnerMood.created_at))}</p>
            </>
          ) : (
            <p className="font-display text-lg font-semibold">No check-in yet</p>
          )}
        </div>
      </div>

      {!open ? (
        <button className="btn-ghost w-full" onClick={() => setOpen(true)}>
          {myMood ? <>You: {myMood.emoji} · Update your mood</> : "How are you feeling?"}
        </button>
      ) : (
        <div className="space-y-3 animate-fadeIn">
          <div className="grid grid-cols-6 gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setEmoji(m)}
                className={`rounded-2xl py-2 text-2xl transition active:scale-90 ${emoji === m ? "bg-rose/20 ring-2 ring-rose" : "bg-line/40"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            className="input"
            maxLength={140}
            placeholder="Add a little note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!emoji || pending} onClick={save}>
              {pending ? "Sharing…" : "Share"}
            </button>
          </div>
          {error && <p className="text-center text-sm text-rose">{error}</p>}
        </div>
      )}
    </section>
  );
}
