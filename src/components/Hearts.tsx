"use client";
import { useImperativeHandle, useState, forwardRef } from "react";

export type HeartsHandle = { burst: (count?: number) => void };

/** Little hearts that float up from the centre of the screen. */
const Hearts = forwardRef<HeartsHandle>(function Hearts(_, ref) {
  const [hearts, setHearts] = useState<{ id: number; x: number; delay: number; emoji: string }[]>([]);
  useImperativeHandle(ref, () => ({
    burst(count = 8) {
      const now = Date.now();
      const emojis = ["💗", "💕", "💞", "🩷", "💖"];
      const fresh = Array.from({ length: count }, (_, i) => ({
        id: now + i,
        x: (Math.random() - 0.5) * 160,
        delay: Math.random() * 0.35,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      }));
      setHearts((h) => [...h, ...fresh]);
      setTimeout(() => setHearts((h) => h.filter((x) => !fresh.includes(x))), 2200);
    },
  }));
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-1/3 z-50 flex justify-center">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="absolute animate-floatUp text-3xl"
          style={{ left: `calc(50% + ${h.x}px)`, animationDelay: `${h.delay}s` }}
        >
          {h.emoji}
        </span>
      ))}
    </div>
  );
});

export default Hearts;
