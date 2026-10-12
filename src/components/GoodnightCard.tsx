"use client";
import { useEffect, useState, useTransition } from "react";
import { sayGoodnight } from "@/app/actions";

export default function GoodnightCard({
  partnerName,
  meDone,
  partnerDone,
  pairKey,
}: {
  partnerName: string;
  meDone: boolean;
  partnerDone: boolean;
  /** Identifies tonight's pair of goodnights, so the animation only plays once. */
  pairKey: string | null;
}) {
  const [pending, start] = useTransition();
  const [show, setShow] = useState(false);
  const both = meDone && partnerDone;

  useEffect(() => {
    if (!both || !pairKey) return;
    let seen = false;
    try {
      seen = localStorage.getItem("gn-seen") === pairKey;
      localStorage.setItem("gn-seen", pairKey);
    } catch {}
    if (!seen) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 4500);
      return () => clearTimeout(t);
    }
  }, [both, pairKey]);

  return (
    <>
      {show && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1b1630]/90 text-white animate-fadeIn" onClick={() => setShow(false)}>
          <style>{`@keyframes re-twinkle{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}@keyframes re-moon{0%{transform:translateY(30px) scale(.8);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}`}</style>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-sm"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                animation: `re-twinkle ${1.5 + (i % 5) * 0.4}s ease-in-out ${(i % 7) * 0.2}s infinite`,
              }}
            >
              ✦
            </span>
          ))}
          <span className="text-8xl" style={{ animation: "re-moon 1.2s ease-out both" }}>🌙</span>
          <p className="mt-6 font-display text-3xl font-semibold">Goodnight, you two</p>
          <p className="mt-1 text-white/70">Sleep well 💤</p>
        </div>
      )}

      <section className="card flex items-center gap-4">
        <span className="text-4xl">{both ? "🌙" : "🌛"}</span>
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">
            {both ? "Goodnight said ✨" : meDone ? `Waiting for ${partnerName}…` : partnerDone ? `${partnerName} said goodnight` : "Off to bed?"}
          </p>
          <p className="text-sm text-muted">
            {both ? "Sweet dreams, both of you." : meDone ? "You've said goodnight." : partnerDone ? "Say it back 💤" : "Say goodnight when you head to sleep."}
          </p>
        </div>
        {!meDone && (
          <button className="btn-primary px-4" disabled={pending} onClick={() => start(async () => { await sayGoodnight(); })}>
            {pending ? "…" : "Goodnight"}
          </button>
        )}
      </section>
    </>
  );
}
