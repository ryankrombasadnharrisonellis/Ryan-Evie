"use client";
import { useState, useTransition } from "react";
import { ackSos } from "@/app/sos/actions";
import { ACK_INFO, SOS_INFO, callLinks, type SosAck, type SosKind } from "@/lib/sos";

type Incoming = { id: string; kind: SosKind; message: string | null; ago: string };

/** The big alert the other person sees on Home until they answer it. */
export default function SosBanner({ items, partnerName, partnerContact }: { items: Incoming[]; partnerName: string; partnerContact: string | null }) {
  const [done, setDone] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const links = callLinks(partnerContact);
  const visible = items.filter((i) => !done.includes(i.id));
  if (!visible.length) return null;

  // Show the most serious one first
  const rank: Record<SosKind, number> = { call: 0, facetime: 1, attention: 2, annoy: 3 };
  const top = [...visible].sort((a, b) => rank[a.kind] - rank[b.kind])[0];
  const others = visible.length - 1;
  const serious = top.kind === "call" || top.kind === "facetime";
  const acks: SosAck[] = serious ? ["calling", "five", "love"] : top.kind === "annoy" ? ["love", "stop"] : ["love", "calling"];

  function ack(a: SosAck) {
    const ids = visible.filter((v) => v.kind === top.kind).map((v) => v.id);
    setDone((d) => [...d, ...ids]);
    start(async () => {
      await Promise.all(ids.map((id) => ackSos(id, a)));
    });
  }

  return (
    <section
      className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-soft animate-fadeIn ${
        top.kind === "call" ? "bg-[#E5484D]" : top.kind === "facetime" ? "bg-[#3E8E6B]" : top.kind === "annoy" ? "bg-[#9B7BD4]" : "bg-[#E0895A]"
      }`}
    >
      {top.kind === "call" && <span className="absolute inset-0 animate-pulse bg-white/10" />}
      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{SOS_INFO[top.kind].emoji}</span>
          <div className="flex-1">
            <p className="font-display text-xl font-semibold leading-tight">
              {partnerName} {SOS_INFO[top.kind].short}
            </p>
            <p className="text-sm text-white/85">
              {top.message ?? SOS_INFO[top.kind].label} · {top.ago}
              {others > 0 ? ` · +${others} more` : ""}
            </p>
          </div>
        </div>

        {serious && links && (
          <div className="grid grid-cols-2 gap-2">
            <a href={links.audio} className="rounded-2xl bg-white px-3 py-3 text-center font-bold text-ink">📞 Call</a>
            <a href={links.facetime} className="rounded-2xl bg-white px-3 py-3 text-center font-bold text-ink">📹 FaceTime</a>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {acks.map((a) => (
            <button key={a} disabled={pending} onClick={() => ack(a)} className="rounded-full bg-white/20 px-3 py-2 text-sm font-semibold active:scale-95">
              {ACK_INFO[a].emoji} {ACK_INFO[a].label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
