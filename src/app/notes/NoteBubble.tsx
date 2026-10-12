"use client";
import { useRef, useState, useTransition } from "react";
import { reactToNote } from "@/app/actions";

const REACTIONS = ["❤️", "😂", "🥺", "😍", "🔥", "🥰"];

export default function NoteBubble({
  id,
  mine,
  body,
  kind,
  mediaUrl,
  when,
  status,
  unread,
  myReaction,
  theirReaction,
}: {
  id: string;
  mine: boolean;
  body: string;
  kind: "text" | "voice" | "doodle";
  mediaUrl: string | null;
  when: string;
  status: string | null;
  unread: boolean;
  myReaction: string | null;
  theirReaction: string | null;
}) {
  const [mineR, setMineR] = useState(myReaction);
  const [picker, setPicker] = useState(false);
  const [, start] = useTransition();
  const lastTap = useRef(0);

  function react(emoji: string | null) {
    setMineR(emoji);
    setPicker(false);
    start(async () => {
      await reactToNote(id, emoji);
    });
  }

  // Double-tap a note from them to ❤️ it
  function onTap() {
    if (mine) return;
    const now = Date.now();
    if (now - lastTap.current < 320) react(mineR === "❤️" ? null : "❤️");
    lastTap.current = now;
  }

  const label = kind === "text" ? body : body.replace(/^🎤 Voice note$|^✏️ A doodle for you$/, "");
  const shown = [theirReaction, mineR].filter(Boolean) as string[];

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[85%]">
        <div
          onClick={onTap}
          onContextMenu={(e) => {
            if (!mine) {
              e.preventDefault();
              setPicker((p) => !p);
            }
          }}
          className={`select-none rounded-3xl px-4 py-3 shadow-soft ${
            mine ? "rounded-br-lg bg-rose text-white" : "rounded-bl-lg border border-line/60 bg-card"
          } ${unread ? "ring-2 ring-peach" : ""}`}
        >
          {kind === "voice" && mediaUrl && <audio src={mediaUrl} controls preload="none" className="mb-1 w-60 max-w-full" />}
          {kind === "doodle" && mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="Doodle" className="mb-1 w-60 max-w-full rounded-2xl bg-white" loading="lazy" />
          )}
          {label && <p className="whitespace-pre-wrap break-words">{label}</p>}
          <p className={`mt-1 text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
            {when}
            {status && ` · ${status}`}
          </p>
        </div>

        {shown.length > 0 && (
          <span className={`absolute -bottom-3 ${mine ? "left-2" : "right-2"} rounded-full border border-line bg-card px-1.5 text-sm shadow-soft`}>
            {shown.join("")}
          </span>
        )}

        {!mine && (
          <button
            onClick={() => setPicker((p) => !p)}
            className="absolute -right-8 top-1/2 -translate-y-1/2 text-lg opacity-50"
            aria-label="React"
          >
            ☺︎
          </button>
        )}

        {picker && (
          <div className="absolute -top-12 left-0 z-10 flex gap-1 rounded-full border border-line bg-card px-2 py-1 shadow-soft animate-fadeIn">
            {REACTIONS.map((r) => (
              <button key={r} onClick={() => react(mineR === r ? null : r)} className={`rounded-full px-1 text-2xl transition active:scale-125 ${mineR === r ? "bg-rose/20" : ""}`}>
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
