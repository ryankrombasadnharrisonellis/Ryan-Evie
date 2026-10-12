"use client";
import { useState, useTransition } from "react";
import { setFacetime } from "@/app/sos/actions";

export default function FacetimeForm({ initial }: { initial: string | null }) {
  const [v, setV] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="card space-y-3">
      <h2 className="font-display text-xl font-semibold">📞 Your number for SOS</h2>
      <p className="text-sm text-muted">Your phone number (with country code) or FaceTime email, so the other person can call you in one tap.</p>
      <input className="input" inputMode="tel" placeholder="+45 12 34 56 78" value={v} maxLength={80} onChange={(e) => setV(e.target.value)} />
      <button
        className="btn-primary w-full"
        disabled={pending || v === (initial ?? "")}
        onClick={() =>
          start(async () => {
            const r = await setFacetime(v);
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
