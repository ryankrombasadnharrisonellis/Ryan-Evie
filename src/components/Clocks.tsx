"use client";
import { useEffect, useState } from "react";
import { formatClock, tzCity } from "@/lib/time";
import type { Weather } from "@/lib/weather";

type Person = { name: string; timezone: string; city: string; weather: Weather };

export default function Clocks({ people }: { people: Person[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="grid grid-cols-2 gap-3">
      {people.map((p) => (
        <div key={p.name} className="card p-4">
          <p className="text-sm font-semibold text-muted">{p.name}</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{now ? formatClock(now, p.timezone) : "--:--"}</p>
          <p className="truncate text-sm text-muted">
            {p.weather ? (
              <>
                {p.weather.emoji} {p.weather.temp}° · {p.city || tzCity(p.timezone)}
              </>
            ) : (
              p.city || tzCity(p.timezone)
            )}
          </p>
        </div>
      ))}
    </section>
  );
}
