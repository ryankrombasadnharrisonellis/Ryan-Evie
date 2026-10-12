"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendNote } from "@/app/actions";
import { formatClock, tzParts } from "@/lib/time";
import { dataUrlToBlob, uploadMedia } from "@/lib/upload";
import VoiceRecorder from "@/components/VoiceRecorder";
import Sketchpad, { type SketchpadHandle } from "@/components/Sketchpad";

const PRESETS = [
  { label: "Their 8am tomorrow", hour: 8, minute: 0, dayOffset: 1 },
  { label: "Their 7am tomorrow", hour: 7, minute: 0, dayOffset: 1 },
  { label: "Their 10pm tonight", hour: 22, minute: 0, dayOffset: 0 },
];

type Mode = "write" | "voice" | "doodle";

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
  const [mode, setMode] = useState<Mode>("write");
  const [body, setBody] = useState("");
  const [clip, setClip] = useState<{ blob: Blob; ext: string } | null>(null);
  const [strokes, setStrokes] = useState(0);
  const sketch = useRef<SketchpadHandle>(null);
  const [later, setLater] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);
  const [theirNow, setTheirNow] = useState<string>("");
  const [resetKey, setResetKey] = useState(0);

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

  const canSend =
    !pending && (!later || !!date) && (mode === "write" ? !!body.trim() : mode === "voice" ? !!clip : strokes > 0);

  function submit() {
    setMsg(null);
    start(async () => {
      try {
        let media: { kind: "voice" | "doodle"; path: string } | undefined;
        if (mode === "voice" && clip) {
          media = { kind: "voice", path: await uploadMedia(clip.blob, "voice", clip.ext) };
        } else if (mode === "doodle" && sketch.current) {
          media = { kind: "doodle", path: await uploadMedia(dataUrlToBlob(sketch.current.toDataUrl(720)), "doodles", "jpg") };
        }
        const r = await sendNote(body, later && date ? `${date}T${time}` : undefined, media);
        if (!r.ok) return setMsg({ text: r.error, good: false });
        setBody("");
        setClip(null);
        setLater(false);
        setResetKey((k) => k + 1);
        setMsg({ text: r.message ?? "Sent", good: true });
      } catch (e) {
        setMsg({ text: (e as Error).message, good: false });
      }
    });
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${mode === m ? "bg-card shadow-soft" : "text-muted"}`}
    >
      {label}
    </button>
  );

  return (
    <section className="card space-y-3">
      <div className="flex gap-1 rounded-2xl bg-line/50 p-1">
        {tab("write", "✍️ Write")}
        {tab("voice", "🎤 Voice")}
        {tab("doodle", "✏️ Doodle")}
      </div>

      {mode === "write" && (
        <textarea
          className="input min-h-[110px] resize-none"
          placeholder={`Write something for ${partnerName}…`}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      )}
      {mode === "voice" && <VoiceRecorder key={`v${resetKey}`} onReady={setClip} />}
      {mode === "doodle" && <Sketchpad key={`d${resetKey}`} ref={sketch} onChange={setStrokes} />}
      {mode !== "write" && (
        <input className="input" placeholder="Add a little message (optional)" maxLength={200} value={body} onChange={(e) => setBody(e.target.value)} />
      )}

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

      <button className="btn-primary w-full" disabled={!canSend} onClick={submit}>
        {pending ? "Sending…" : later ? "Schedule it ⏰" : mode === "voice" ? "Send voice note 🎤" : mode === "doodle" ? "Send doodle ✏️" : "Send note 💌"}
      </button>
      {msg && <p className={`text-center text-sm ${msg.good ? "text-muted" : "text-rose"}`}>{msg.text}</p>}
    </section>
  );
}
