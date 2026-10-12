"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const COLORS = ["#3A2A30", "#EC7084", "#F7B28C", "#F9D56E", "#7BC58E", "#8CB0DE", "#9B7BD4", "#8B5A3C"];
const SIZES = [4, 9, 18];

type Stroke = { color: string; size: number; points: [number, number][] };

export type SketchpadHandle = {
  /** JPEG data URL of the drawing, downscaled to `size` px square. */
  toDataUrl: (size?: number) => string;
  isEmpty: () => boolean;
};

/** A finger-friendly drawing canvas with colours, brush sizes, eraser, undo and clear. */
const Sketchpad = forwardRef<SketchpadHandle, { onChange?: (strokes: number) => void }>(function Sketchpad({ onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);

  useImperativeHandle(ref, () => ({
    toDataUrl(px = 480) {
      const c = canvasRef.current!;
      const out = document.createElement("canvas");
      out.width = px;
      out.height = px;
      out.getContext("2d")!.drawImage(c, 0, 0, px, px);
      return out.toDataURL("image/jpeg", 0.75);
    },
    isEmpty: () => strokes.length === 0,
  }));

  useEffect(() => {
    onChange?.(strokes.length);
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    for (const s of strokes) drawStroke(ctx, s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    drawStroke(canvasRef.current!.getContext("2d")!, current.current);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
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

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={720}
        height={720}
        className="aspect-square w-full touch-none rounded-3xl border border-line bg-white shadow-soft"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />
      <div className="card space-y-3 py-3">
        <div className="flex justify-between">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
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
              type="button"
              onClick={() => setSize(s)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${size === s ? "bg-rose/20" : "bg-line/50"}`}
              aria-label="Brush size"
            >
              <span className="rounded-full bg-ink" style={{ width: s, height: s }} />
            </button>
          ))}
          <button type="button" onClick={() => setEraser((e) => !e)} className={`h-10 rounded-xl px-3 text-sm ${eraser ? "bg-rose/20" : "bg-line/50"}`}>
            🧽
          </button>
          <button type="button" onClick={() => setStrokes((s) => s.slice(0, -1))} className="h-10 rounded-xl bg-line/50 px-3 text-sm" disabled={!strokes.length}>
            ↩️
          </button>
          <button type="button" onClick={() => setStrokes([])} className="h-10 rounded-xl bg-line/50 px-3 text-sm" disabled={!strokes.length}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
});

export default Sketchpad;
