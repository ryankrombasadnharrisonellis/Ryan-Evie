"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { notify } from "@/lib/notify";
import { ACK_INFO, ANNOY_LINES, SOS_INFO, type SosAck, type SosKind } from "@/lib/sos";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function sendSos(kind: SosKind): Promise<Result> {
  try {
    const supabase = await createClient();
    const { me, partner } = await getMeAndPartner(supabase);
    if (!me) return { ok: false, error: "Not logged in" };
    if (!partner) return { ok: false, error: "Your person hasn't joined yet." };
    if (!(kind in SOS_INFO)) return { ok: false, error: "Unknown" };
    const admin = createAdminClient();

    // Gentle spam guard: one of each kind every 10 seconds
    const { data: recent } = await admin
      .from("sos")
      .select("id")
      .eq("sender_id", me.id)
      .eq("kind", kind)
      .gte("created_at", new Date(Date.now() - 10_000).toISOString())
      .limit(1);
    if (recent?.length) return { ok: false, error: "Easy tiger — give it a few seconds 😅" };

    const message = kind === "annoy" ? ANNOY_LINES[Math.floor(Math.random() * ANNOY_LINES.length)] : null;
    const { data, error } = await admin
      .from("sos")
      .insert({ sender_id: me.id, recipient_id: partner.id, kind, message })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    const info = SOS_INFO[kind];
    const body =
      kind === "call"
        ? "Immediate call needed. Tap to call back."
        : kind === "facetime"
          ? `${me.display_name} has booked you for a 10-minute FaceTime. Non-negotiable.`
          : kind === "attention"
            ? "Drop everything (or at least send a heart)."
            : message!;
    // A real "call me now" ignores quiet hours; the playful ones wait until morning.
    const urgent = kind === "call";
    after(() =>
      notify(
        partner.id,
        { title: `${info.emoji} ${me.display_name} ${info.short}`, body, url: `/?sos=${data.id}`, tag: kind === "annoy" ? "annoy" : `sos-${data.id}` },
        { respectQuietHours: !urgent }
      ).catch(console.error)
    );
    revalidatePath("/");
    return { ok: true, message: kind === "annoy" ? `Sent: “${message}”` : `Sent to ${partner.display_name} ${info.emoji}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function ackSos(id: string, ack: SosAck): Promise<Result> {
  try {
    const supabase = await createClient();
    const { me, partner } = await getMeAndPartner(supabase);
    if (!me) return { ok: false, error: "Not logged in" };
    if (!(ack in ACK_INFO)) return { ok: false, error: "Unknown" };
    const admin = createAdminClient();
    const { data: row } = await admin.from("sos").select("id, recipient_id, sender_id, kind").eq("id", id).single();
    if (!row || row.recipient_id !== me.id) return { ok: false, error: "Not found" };
    await admin.from("sos").update({ acked_at: new Date().toISOString(), ack }).eq("id", id);
    if (partner) {
      const a = ACK_INFO[ack];
      after(() =>
        notify(
          partner.id,
          { title: `${a.emoji} ${me.display_name}: ${a.label}`, body: `Reply to your ${SOS_INFO[row.kind as SosKind].label.toLowerCase()}`, url: "/", tag: `sos-${id}` },
          { respectQuietHours: false }
        ).catch(console.error)
      );
    }
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setFacetime(contact: string): Promise<Result> {
  try {
    const supabase = await createClient();
    const { me } = await getMeAndPartner(supabase);
    if (!me) return { ok: false, error: "Not logged in" };
    const clean = contact.trim().slice(0, 80);
    const { error } = await supabase.from("profiles").update({ facetime: clean || null }).eq("id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved ✓" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
