"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { rerollDrawWord, submitDrawing } from "@/app/play/actions";

const COLORS = ["#3A2A30", "#EC7084", "#F7B28C", "#F9D56E", "#7BC58E", "#8CB0DE", "#9B7BD4", "#8B5A3C"];
const SIZES = [4, 9, 18];

type Stroke = { color: string; size: number; points: [number, number][] };

export default function DrawPad({ gameId, word, partnerName }: { gameId: string; word: string; partnerName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Redraw everything whenever strokes change
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    for (const s of strokes) drawStroke(ctx, s);
  }, [strokes]);

  function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.points.length === 1) {
      ctx.beginPath();
      ctx.arc(s.points[0][0], s.points[0][1], s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0][0], s.points[0][1]);
    for (const [x, y] of s.points.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = { color: eraser ? "#ffffff" : color, size: eraser ? size * 2 : size, points: [pos(e)] };
    const ctx = canvasRef.current!.getContext("2d")!;
    drawStroke(ctx, current.current);
  }
  function moveP(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = current.current;
    if (!s) return;
    const p = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    const prev = s.points[s.points.length - 1];
    s.points.push(p);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }
  function up() {
    if (current.current) {
      const s = current.current;
      current.current = null;
      setStrokes((all) => [...all, s]);
    }
  }

  function send() {
    const c = canvasRef.current!;
    // Downscale to keep it light
    const out = document.createElement("canvas");
    out.width = 480;
    out.height = 480;
    out.getContext("2d")!.drawImage(c, 0, 0, 480, 480);
    const data = out.toDataURL("image/jpeg", 0.75);
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
          disabled={pending || strokes.length > 0}
          onClick={() => start(async () => { const r = await rerollDrawWord(gameId); setMsg(r.ok ? null : r.error); })}
        >
          🔄 Swap
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={720}
        className="aspect-square w-full touch-none rounded-3xl border border-line bg-white shadow-soft"
        onPointerDown={down}
        onPointerMove={moveP}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />

      <div className="card space-y-3 py-3">
        <div className="flex justify-between">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false); }}
              className={`h-8 w-8 rounded-full transition ${!eraser && color === c ? "scale-110 ring-2 ring-rose ring-offset-2 ring-offset-card" : ""}`}
              style={{ background: c }}
              aria-label="Colour"
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${size === s ? "bg-rose/20" : "bg-line/50"}`}
              aria-label="Brush size"
            >
              <span className="rounded-full bg-ink" style={{ width: s, height: s }} />
            </button>
          ))}
          <button onClick={() => setEraser((e) => !e)} className={`h-10 rounded-xl px-3 text-sm font-semibold ${eraser ? "bg-rose/20" : "bg-line/50"}`}>
            🧽
          </button>
          <button onClick={() => setStrokes((s) => s.slice(0, -1))} className="h-10 rounded-xl bg-line/50 px-3 text-sm font-semibold" disabled={!strokes.length}>
            ↩️
          </button>
          <button onClick={() => setStrokes([])} className="h-10 rounded-xl bg-line/50 px-3 text-sm font-semibold" disabled={!strokes.length}>
            🗑️
          </button>
        </div>
      </div>

      <button className="btn-primary w-full" disabled={pending || !strokes.length} onClick={send}>
        {pending ? "Sending…" : `Send to ${partnerName} ✏️`}
      </button>
      {msg && <p className="text-center text-sm text-rose">{msg}</p>}
    </div>
  );
}
