"use client";
import { useRef, useState, useTransition } from "react";
import { rerollDrawWord, submitDrawing } from "@/app/play/actions";
import Sketchpad, { type SketchpadHandle } from "@/components/Sketchpad";

export default function DrawPad({ gameId, word, partnerName }: { gameId: string; word: string; partnerName: string }) {
  const pad = useRef<SketchpadHandle>(null);
  const [strokes, setStrokes] = useState(0);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function send() {
    const data = pad.current?.toDataUrl(480);
    if (!data) return;
    start(async () => {
      const r = await submitDrawing(gameId, data);
      if (!r.ok) setMsg(r.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between gap-3 py-3">
        <div>
          <p className="text-xs font-semibold text-muted">Draw this (don&apos;t write the word!)</p>
          <p className="font-display text-2xl font-semibold capitalize">{word}</p>
        </div>
        <button
          className="btn-ghost px-3 py-2 text-sm"
          disabled={pending || strokes > 0}
          onClick={() =>
            start(async () => {
              const r = await rerollDrawWord(gameId);
              setMsg(r.ok ? null : r.error);
            })
          }
        >
          🔄 Swap
        </button>
      </div>
      <Sketchpad ref={pad} onChange={setStrokes} />
      <button className="btn-primary w-full" disabled={pending || !strokes} onClick={send}>
        {pending ? "Sending…" : `Send to ${partnerName} ✏️`}
      </button>
      {msg && <p className="text-center text-sm text-rose">{msg}</p>}
    </div>
  );
}
