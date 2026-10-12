"use client";
import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions";

type Initial = {
  display_name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  quiet_start: string | null;
  quiet_end: string | null;
};

type Place = { name: string; country?: string; admin1?: string; latitude: number; longitude: number; timezone: string };

export default function ProfileForm({ initial }: { initial: Initial }) {
  const [name, setName] = useState(initial.display_name);
  const [place, setPlace] = useState<Place | null>(
    initial.latitude != null && initial.longitude != null
      ? { name: initial.city, latitude: initial.latitude, longitude: initial.longitude, timezone: initial.timezone }
      : null
  );
  const [timezone, setTimezone] = useState(initial.timezone);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [quietOn, setQuietOn] = useState(!!(initial.quiet_start && initial.quiet_end));
  const [qs, setQs] = useState(initial.quiet_start ?? "23:00");
  const [qe, setQe] = useState(initial.quiet_end ?? "08:00");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`
      );
      const j = (await res.json()) as { results?: Place[] };
      setResults(j.results ?? []);
      if (!j.results?.length) setMsg({ text: "No places found — try another spelling.", good: false });
    } catch {
      setMsg({ text: "Couldn't search right now.", good: false });
    } finally {
      setSearching(false);
    }
  }

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProfile({
        display_name: name,
        city: place?.name ?? initial.city,
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
        timezone,
        quiet_start: quietOn ? qs : null,
        quiet_end: quietOn ? qe : null,
      });
      setMsg(r.ok ? { text: r.message ?? "Saved", good: true } : { text: r.error, good: false });
    });
  }

  return (
    <section className="card space-y-4">
      <h2 className="font-display text-xl font-semibold">👤 You</h2>

      <label className="block space-y-1">
        <span className="text-sm font-semibold text-muted">Name</span>
        <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="space-y-1">
        <span className="text-sm font-semibold text-muted">City (for your time &amp; weather)</span>
        <p className="text-sm">
          {place ? (
            <>📍 {place.name}{place.country ? `, ${place.country}` : ""} · {timezone}</>
          ) : (
            <>No city set · {timezone}</>
          )}
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search a city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn-ghost shrink-0 px-4" onClick={search} disabled={searching}>
            {searching ? "…" : "Find"}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-line">
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button
                  className="w-full px-4 py-3 text-left text-sm hover:bg-line/40"
                  onClick={() => {
                    setPlace(r);
                    setTimezone(r.timezone);
                    setResults([]);
                    setQuery("");
                  }}
                >
                  <b>{r.name}</b>
                  <span className="text-muted">
                    {r.admin1 ? `, ${r.admin1}` : ""}
                    {r.country ? `, ${r.country}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>
            <span className="block text-sm font-semibold">🤫 Quiet hours</span>
            <span className="block text-xs text-muted">No notifications during these hours — they arrive when quiet hours end.</span>
          </span>
          <input type="checkbox" className="h-6 w-6 accent-rose" checked={quietOn} onChange={(e) => setQuietOn(e.target.checked)} />
        </label>
        {quietOn && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">From</span>
              <input type="time" className="input" value={qs} onChange={(e) => setQs(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Until</span>
              <input type="time" className="input" value={qe} onChange={(e) => setQe(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      <button className="btn-primary w-full" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {msg && <p className={`text-center text-sm ${msg.good ? "text-muted" : "text-rose"}`}>{msg.text}</p>}
    </section>
  );
}
