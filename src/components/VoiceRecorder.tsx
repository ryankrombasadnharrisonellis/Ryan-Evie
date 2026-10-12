"use client";
import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 90;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/aac"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
}

/** Hold-free voice recorder: tap to start, tap to stop, listen back, then hand the clip to the parent. */
export default function VoiceRecorder({ onReady }: { onReady: (clip: { blob: Blob; ext: string } | null) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => () => stopAll(), []);

  function stopAll() {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    setError(null);
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice notes aren't supported on this browser.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Allow microphone access to record (Settings → Safari → Microphone).");
      return;
    }
    chunks.current = [];
    const r = mime ? new MediaRecorder(stream.current, { mimeType: mime }) : new MediaRecorder(stream.current);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      stopAll();
      const type = r.mimeType || mime || "audio/mp4";
      const blob = new Blob(chunks.current, { type });
      const ext = type.includes("webm") ? "webm" : type.includes("aac") ? "aac" : "m4a";
      setUrl(URL.createObjectURL(blob));
      setState("done");
      onReady({ blob, ext });
    };
    rec.current = r;
    r.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) rec.current?.stop();
        return s + 1;
      });
    }, 1000);
  }

  function stop() {
    rec.current?.stop();
  }

  function redo() {
    setUrl(null);
    setState("idle");
    onReady(null);
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3 rounded-2xl bg-line/30 p-4 text-center">
      {state === "idle" && (
        <button onClick={start} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose text-4xl text-white shadow-soft active:scale-95">
          🎤
        </button>
      )}
      {state === "recording" && (
        <>
          <button onClick={stop} className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-rose text-3xl text-white shadow-soft active:scale-95">
            ■
          </button>
          <p className="font-display text-xl font-semibold tabular-nums">{mmss}</p>
          <p className="text-xs text-muted">Tap to stop · max {MAX_SECONDS / 60 >= 1 ? `${MAX_SECONDS / 60} min` : `${MAX_SECONDS}s`}</p>
        </>
      )}
      {state === "done" && url && (
        <>
          <audio src={url} controls className="w-full" />
          <button onClick={redo} className="text-sm font-semibold text-muted underline">Record again</button>
        </>
      )}
      {state === "idle" && <p className="text-sm text-muted">Tap to record a voice note</p>}
      {error && <p className="text-sm text-rose">{error}</p>}
    </div>
  );
}
