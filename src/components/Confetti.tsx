"use client";
import { forwardRef, useImperativeHandle, useState } from "react";

export type ConfettiHandle = { fire: (count?: number) => void };

const COLORS = ["#EC7084", "#F7B28C", "#8CB0DE", "#F9D56E", "#B8E0C2", "#C9A7EB"];

/** Lightweight CSS confetti that falls from the top of the screen. */
const Confetti = forwardRef<ConfettiHandle>(function Confetti(_, ref) {
  const [pieces, setPieces] = useState<{ id: number; left: number; color: string; delay: number; dur: number; rot: number; round: boolean }[]>([]);
  useImperativeHandle(ref, () => ({
    fire(count = 70) {
      const now = Date.now();
      const fresh = Array.from({ length: count }, (_, i) => ({
        id: now + i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        rot: Math.random() * 360,
        round: Math.random() > 0.6,
      }));
      setPieces((p) => [...p, ...fresh]);
      setTimeout(() => setPieces((p) => p.filter((x) => !fresh.includes(x))), 3800);
    },
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style>{`@keyframes re-fall{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:.9}}`}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.round ? 8 : 7,
            height: p.round ? 8 : 12,
            borderRadius: p.round ? 999 : 2,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `re-fall ${p.dur}s cubic-bezier(.2,.6,.4,1) ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
});

export default Confetti;
