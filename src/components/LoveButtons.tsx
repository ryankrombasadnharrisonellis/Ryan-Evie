"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendPing, type PingKind } from "@/app/actions";
import Hearts, { type HeartsHandle } from "@/components/Hearts";

const SMALL: { kind: PingKind; label: string; emoji: string }[] = [
  { kind: "love", label: "I love you", emoji: "❤️" },
  { kind: "miss", label: "I miss you", emoji: "🥺" },
  { kind: "hug", label: "Hug", emoji: "🤗" },
  { kind: "kiss", label: "Kiss", emoji: "😘" },
];

export default function LoveButtons({
  partnerName,
  sentToday,
  receivedToday,
}: {
  partnerName: string;
  sentToday: number;
  receivedToday: number;
}) {
  const hearts = useRef<HeartsHandle>(null);
  const [pending, start] = useTransition();
  const [extra, setExtra] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [popKey, setPopKey] = useState(0);

  // Once the server count catches up, drop the optimistic extra.
  useEffect(() => setExtra(0), [sentToday]);

  function tap(kind: PingKind) {
    hearts.current?.burst(kind === "thinking" ? 10 : 6);
    setPopKey((k) => k + 1);
    setExtra((x) => x + 1);
    setMsg(null);
    start(async () => {
      const r = await sendPing(kind);
      if (!r.ok) {
        setExtra((x) => x - 1);
        setMsg(r.error);
      } else if (r.message) setMsg(r.message);
    });
  }

  return (
    <section className="card space-y-4">
      <Hearts ref={hearts} />
      <button
        key={popKey}
        onClick={() => tap("thinking")}
        className="flex w-full animate-pop flex-col items-center justify-center gap-1 rounded-4xl bg-gradient-to-br from-peach to-rose px-6 py-8 text-white shadow-soft active:scale-[0.97]"
      >
        <span className="text-5xl drop-shadow-sm">💭</span>
        <span className="font-display text-2xl font-semibold">Thinking of you</span>
        <span className="text-sm text-white/85">Tap to let {partnerName} know</span>
      </button>

      <div className="grid grid-cols-4 gap-2">
        {SMALL.map((b) => (
          <button
            key={b.kind}
            onClick={() => tap(b.kind)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-line/50 px-1 py-3 text-xs font-semibold text-ink transition active:scale-90"
          >
            <span className="text-2xl">{b.emoji}</span>
            {b.label}
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-muted">
        Today: you sent <b className="text-ink">{sentToday + extra}</b> · {partnerName} sent <b className="text-ink">{receivedToday}</b>
        {pending && " ·"}
      </p>
      {msg && <p className="text-center text-sm text-muted">{msg}</p>}
    </section>
  );
}
