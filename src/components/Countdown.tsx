"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { daysUntil } from "@/lib/time";
import Confetti, { type ConfettiHandle } from "@/components/Confetti";

export default function Countdown({ nextVisit, timezone }: { nextVisit: string | null; timezone: string }) {
  const [days, setDays] = useState<number | null>(null);
  const confetti = useRef<ConfettiHandle>(null);

  useEffect(() => {
    if (!nextVisit) return;
    const update = () => setDays(daysUntil(nextVisit, timezone));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [nextVisit, timezone]);

  useEffect(() => {
    if (days === 0) {
      const t = setTimeout(() => confetti.current?.fire(), 400);
      return () => clearTimeout(t);
    }
  }, [days]);

  if (!nextVisit || (days !== null && days < 0)) {
    return (
      <Link href="/settings#visit" className="card block text-center">
        <p className="text-3xl">🗓️</p>
        <p className="mt-1 font-display text-lg font-semibold">When do we see each other next?</p>
        <p className="text-sm text-muted">Tap to set the date and start the countdown.</p>
      </Link>
    );
  }

  const nice = new Date(nextVisit + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });

  return (
    <section
      className="card relative overflow-hidden bg-gradient-to-br from-sky/25 via-card to-rose/20 text-center"
      onClick={() => days === 0 && confetti.current?.fire()}
    >
      <Confetti ref={confetti} />
      {days === 0 ? (
        <>
          <p className="text-5xl">🎉</p>
          <p className="mt-2 font-display text-3xl font-semibold">It&apos;s today!</p>
          <p className="text-muted">See you very soon 💗</p>
        </>
      ) : (
        <>
          <p className="font-display text-6xl font-semibold tabular-nums leading-none text-rose">{days ?? "…"}</p>
          <p className="mt-2 font-display text-lg font-semibold">{days === 1 ? "day to go" : "days to go"}</p>
          <p className="text-sm text-muted">until {nice}</p>
        </>
      )}
    </section>
  );
}
