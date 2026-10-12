"use client";
import { useState, useTransition } from "react";
import { setTogetherSince } from "@/app/actions";

export default function TogetherForm({ initial }: { initial: string | null }) {
  const [date, setDate] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section id="us" className="card space-y-3">
      <h2 className="font-display text-xl font-semibold">💞 Together since</h2>
      <p className="text-sm text-muted">For your day counter and anniversary countdown.</p>
      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      <button
        className="btn-primary w-full"
        disabled={pending || !date || date === initial}
        onClick={() =>
          start(async () => {
            const r = await setTogetherSince(date);
            setMsg(r.ok ? r.message ?? "Saved" : r.error);
          })
        }
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {msg && <p className="text-center text-sm text-muted">{msg}</p>}
    </section>
  );
}
