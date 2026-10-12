"use client";
import { useState, useTransition } from "react";
import { sendSos } from "@/app/sos/actions";
import { SOS_INFO, callLinks, type SosKind } from "@/lib/sos";

const ORDER: SosKind[] = ["call", "facetime", "attention", "annoy"];

export default function SosCard({
  partnerName,
  partnerContact,
  lastSent,
}: {
  partnerName: string;
  partnerContact: string | null;
  lastSent: { kind: SosKind; ack: string | null; ackLabel: string | null; ago: string } | null;
}) {
  const [armed, setArmed] = useState<SosKind | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);
  const [shake, setShake] = useState(0);
  const links = callLinks(partnerContact);

  function press(kind: SosKind) {
    // The serious ones need a second tap so they can't be sent by accident
    if ((kind === "call" || kind === "facetime") && armed !== kind) {
      setArmed(kind);
      setMsg(null);
      setTimeout(() => setArmed((a) => (a === kind ? null : a)), 3000);
      return;
    }
    setArmed(null);
    setShake((s) => s + 1);
    start(async () => {
      const r = await sendSos(kind);
      setMsg(r.ok ? { text: r.message ?? "Sent", good: true } : { text: r.error, good: false });
    });
  }

  const style: Record<SosKind, string> = {
    call: "bg-[#E5484D] text-white",
    facetime: "bg-[#3E8E6B] text-white",
    attention: "bg-peach/80 text-ink",
    annoy: "bg-[#9B7BD4] text-white",
  };

  return (
    <section className="card space-y-3 border-[#E5484D]/30">
      <style>{`@keyframes re-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}`}</style>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">SOS 🚨</h2>
        {links && (
          <div className="flex gap-2">
            <a href={links.audio} className="rounded-full bg-line/60 px-3 py-1.5 text-xs font-semibold">📞 Call</a>
            <a href={links.facetime} className="rounded-full bg-line/60 px-3 py-1.5 text-xs font-semibold">📹 FaceTime</a>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ORDER.map((k) => (
          <button
            key={k === "annoy" ? `${k}-${shake}` : k}
            onClick={() => press(k)}
            disabled={pending}
            className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-3xl px-2 py-3 text-center text-sm font-bold shadow-soft transition active:scale-95 ${style[k]} ${
              armed === k ? "ring-4 ring-ink/30" : ""
            }`}
            style={k === "annoy" && shake ? { animation: "re-wiggle .3s 2" } : undefined}
          >
            <span className="text-3xl">{SOS_INFO[k].emoji}</span>
            {armed === k ? "Tap again to send" : SOS_INFO[k].label}
          </button>
        ))}
      </div>
      {lastSent && (
        <p className="text-center text-xs text-muted">
          Last sent: {SOS_INFO[lastSent.kind].emoji} {lastSent.ago}
          {lastSent.ackLabel ? ` · ${partnerName}: ${lastSent.ackLabel}` : " · not answered yet"}
        </p>
      )}
      {msg && <p className={`text-center text-sm ${msg.good ? "text-muted" : "text-rose"}`}>{msg.text}</p>}
      {!partnerContact && (
        <p className="text-center text-[11px] text-muted">Tip: ask {partnerName} to add their number in ⚙️ Settings so the call buttons dial straight away.</p>
      )}
    </section>
  );
}
