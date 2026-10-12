"use client";
import { useState, useTransition } from "react";
import { setNextVisit } from "@/app/actions";

export default function VisitForm({ initial }: { initial: string | null }) {
  const [date, setDate] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section id="visit" className="card space-y-3">
      <h2 className="font-display text-xl font-semibold">🗓️ Next time we see each other</h2>
      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-ghost"
          disabled={pending || !initial}
          onClick={() => start(async () => { const r = await setNextVisit(null); setDate(""); setMsg(r.ok ? "Cleared" : r.error); })}
        >
          Clear
        </button>
        <button
          className="btn-primary"
          disabled={pending || !date || date === initial}
          onClick={() => start(async () => { const r = await setNextVisit(date); setMsg(r.ok ? r.message ?? "Saved" : r.error); })}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {msg && <p className="text-center text-sm text-muted">{msg}</p>}
    </section>
  );
}
