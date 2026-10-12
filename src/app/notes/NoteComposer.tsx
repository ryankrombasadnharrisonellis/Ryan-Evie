"use client";
import { useEffect, useState, useTransition } from "react";
import { sendNote } from "@/app/actions";
import { formatClock, tzParts } from "@/lib/time";

const PRESETS = [
  { label: "Their 8am tomorrow", hour: 8, minute: 0, dayOffset: 1 },
  { label: "Their 7am tomorrow", hour: 7, minute: 0, dayOffset: 1 },
  { label: "Their 10pm tonight", hour: 22, minute: 0, dayOffset: 0 },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function NoteComposer({
  partnerName,
  partnerTimezone,
  partnerCity,
}: {
  partnerName: string;
  partnerTimezone: string;
  partnerCity: string;
}) {
  const [body, setBody] = useState("");
  const [later, setLater] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);
  const [theirNow, setTheirNow] = useState<string>("");

  useEffect(() => {
    const update = () => setTheirNow(formatClock(new Date(), partnerTimezone));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [partnerTimezone]);

  function applyPreset(p: (typeof PRESETS)[number]) {
    const now = tzParts(new Date(), partnerTimezone);
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day + p.dayOffset));
    setDate(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
    setTime(`${pad(p.hour)}:${pad(p.minute)}`);
    setLater(true);
  }

  function submit() {
    setMsg(null);
    start(async () => {
      const r = await sendNote(body, later && date ? `${date}T${time}` : undefined);
      if (!r.ok) return setMsg({ text: r.error, good: false });
      setBody("");
      setLater(false);
      setMsg({ text: r.message ?? "Sent", good: true });
    });
  }

  return (
    <section className="card space-y-3">
      <textarea
        className="input min-h-[110px] resize-none"
        placeholder={`Write something for ${partnerName}…`}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => applyPreset(p)} className="rounded-full bg-line/60 px-3 py-1.5 text-xs font-semibold">
            ⏰ {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLater((l) => !l)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${later ? "bg-rose/20 text-rose" : "bg-line/60"}`}
        >
          {later ? "✕ Send now instead" : "📅 Pick a time"}
        </button>
      </div>

      {later && (
        <div className="space-y-2 rounded-2xl bg-line/30 p-3 animate-fadeIn">
          <p className="text-xs text-muted">
            In {partnerName}&apos;s time ({partnerCity}, now {theirNow})
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      )}

      <button className="btn-primary w-full" disabled={pending || !body.trim() || (later && !date)} onClick={submit}>
        {pending ? "Sending…" : later ? "Schedule note ⏰" : "Send note 💌"}
      </button>
      {msg && <p className={`text-center text-sm ${msg.good ? "text-muted" : "text-rose"}`}>{msg.text}</p>}
    </section>
  );
}
