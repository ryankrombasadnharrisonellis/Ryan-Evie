"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { notify } from "@/lib/notify";
import { isValidTimeZone, quietUntil, zonedToUtc } from "@/lib/time";
import { questionFor, todayQDate } from "@/lib/questions";

/** Send the push after the response has gone back, so taps feel instant. */
function notifyLater(...args: Parameters<typeof notify>) {
  after(async () => {
    try {
      await notify(...args);
    } catch (e) {
      console.error("[notify]", e);
    }
  });
}

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function ctx() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) throw new Error("Not logged in");
  return { supabase, me, partner };
}

// ---------- Love taps ----------
export type PingKind = "thinking" | "love" | "miss" | "hug" | "kiss";

const PING_TEXT: Record<PingKind, (name: string) => { title: string; body: string }> = {
  thinking: (n) => ({ title: `💭 ${n} is thinking of you`, body: "Just so you know." }),
  love: (n) => ({ title: `❤️ ${n} loves you`, body: "Like, a lot." }),
  miss: (n) => ({ title: `🥺 ${n} misses you`, body: "Counting down the days." }),
  hug: (n) => ({ title: `🤗 ${n} sent you a hug`, body: "A big squeezy one." }),
  kiss: (n) => ({ title: `😘 ${n} sent you a kiss`, body: "Mwah." }),
};

export async function sendPing(kind: PingKind): Promise<Result> {
  try {
    const { supabase, me, partner } = await ctx();
    if (!partner) return { ok: false, error: "Your person hasn't joined yet." };
    if (!(kind in PING_TEXT)) return { ok: false, error: "Unknown" };
    const { error } = await supabase.from("pings").insert({ sender_id: me.id, recipient_id: partner.id, kind });
    if (error) return { ok: false, error: error.message };
    notifyLater(
      partner.id,
      { ...PING_TEXT[kind](me.display_name), url: "/", tag: "ping" },
      { senderName: me.display_name }
    );
    revalidatePath("/");
    const quiet = quietUntil(new Date(), partner.timezone, partner.quiet_start, partner.quiet_end);
    return { ok: true, message: quiet ? `${partner.display_name}'s in quiet hours — they'll get it when they wake up.` : undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------- Notes ----------
/** `deliverLocal` is "YYYY-MM-DDTHH:MM" in the partner's time zone, or empty for "now". */
export async function sendNote(body: string, deliverLocal?: string): Promise<Result> {
  try {
    const { supabase, me, partner } = await ctx();
    if (!partner) return { ok: false, error: "Your person hasn't joined yet." };
    const text = body.trim();
    if (!text) return { ok: false, error: "Write something first 🙂" };
    if (text.length > 1000) return { ok: false, error: "That's a bit long — keep it under 1000 characters." };

    let deliverAt = new Date();
    if (deliverLocal) {
      const m = deliverLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
      if (!m) return { ok: false, error: "Pick a date and time." };
      deliverAt = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], partner.timezone);
      if (deliverAt.getTime() < Date.now() - 60_000) return { ok: false, error: "That time has already passed for them." };
    }
    const scheduled = deliverAt.getTime() > Date.now() + 30_000;

    const { error } = await supabase.from("notes").insert({
      sender_id: me.id,
      recipient_id: partner.id,
      body: text,
      deliver_at: deliverAt.toISOString(),
      delivered_at: scheduled ? null : new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };

    if (!scheduled) {
      notifyLater(partner.id, {
        title: `💌 A note from ${me.display_name}`,
        body: text.length > 140 ? text.slice(0, 137) + "…" : text,
        url: "/notes",
      });
    }
    revalidatePath("/notes");
    revalidatePath("/");
    return { ok: true, message: scheduled ? "Scheduled 💌" : "Sent 💌" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function cancelNote(id: string): Promise<Result> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  revalidatePath("/notes");
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Goodnight ----------
export async function sayGoodnight(): Promise<Result> {
  try {
    const { supabase, me, partner } = await ctx();
    const since = new Date(Date.now() - 14 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase.from("goodnights").select("user_id").gte("created_at", since);
    if ((recent ?? []).some((g) => g.user_id === me.id)) return { ok: true };

    const { error } = await supabase.from("goodnights").insert({ user_id: me.id });
    if (error) return { ok: false, error: error.message };

    if (partner) {
      const partnerDone = (recent ?? []).some((g) => g.user_id === partner.id);
      notifyLater(
        partner.id,
        partnerDone
          ? { title: "🌙 Goodnight, you two", body: `${me.display_name} said goodnight back. Sweet dreams ✨`, url: "/", tag: "goodnight" }
          : { title: `🌙 ${me.display_name} said goodnight`, body: "Say it back before you sleep 💤", url: "/", tag: "goodnight" },
        { respectQuietHours: !partnerDone }
      );
    }
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------- Mood ----------
export async function setMood(emoji: string, note: string): Promise<Result> {
  try {
    const { supabase, me, partner } = await ctx();
    const clean = note.trim().slice(0, 140);
    const { error } = await supabase.from("moods").insert({ user_id: me.id, emoji: emoji.slice(0, 16), note: clean || null });
    if (error) return { ok: false, error: error.message };
    if (partner) {
      notifyLater(partner.id, {
        title: `${emoji} ${me.display_name} checked in`,
        body: clean || `Feeling ${emoji}`,
        url: "/",
        tag: "mood",
      });
    }
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------- Daily question ----------
export async function answerQuestion(answer: string): Promise<Result> {
  try {
    const { supabase, me, partner } = await ctx();
    const text = answer.trim();
    if (!text) return { ok: false, error: "Write an answer first 🙂" };
    const qdate = todayQDate();
    const q = questionFor(qdate);
    const { error } = await supabase
      .from("question_answers")
      .insert({ user_id: me.id, qdate, question_index: q.index, answer: text.slice(0, 1000) });
    if (error) {
      return { ok: false, error: /duplicate/i.test(error.message) ? "You've already answered today." : error.message };
    }
    if (partner) {
      const { data: theirs } = await supabase.rpc("answered_today", { d: qdate });
      const partnerDone = ((theirs ?? []) as { user_id: string }[]).some((r) => r.user_id === partner.id);
      notifyLater(partner.id, {
        title: partnerDone ? "👀 You've both answered!" : `✍️ ${me.display_name} answered today's question`,
        body: partnerDone ? `See what ${me.display_name} said.` : "Your turn — then you can see their answer.",
        url: "/question",
        tag: "question",
      });
    }
    revalidatePath("/question");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------- Settings ----------
export async function updateProfile(input: {
  display_name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  quiet_start: string | null;
  quiet_end: string | null;
}): Promise<Result> {
  try {
    const { supabase, me } = await ctx();
    if (!input.display_name.trim()) return { ok: false, error: "Name can't be empty." };
    if (!isValidTimeZone(input.timezone)) return { ok: false, error: "Unknown time zone." };
    const time = /^\d{2}:\d{2}$/;
    const qs = input.quiet_start && time.test(input.quiet_start) ? input.quiet_start : null;
    const qe = input.quiet_end && time.test(input.quiet_end) ? input.quiet_end : null;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: input.display_name.trim().slice(0, 40),
        city: input.city.trim().slice(0, 80),
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.timezone,
        quiet_start: qs && qe ? qs : null,
        quiet_end: qs && qe ? qe : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved ✓" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setNextVisit(date: string | null): Promise<Result> {
  try {
    const { supabase, me, partner } = await ctx();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Pick a date." };
    const { error } = await supabase
      .from("couple_settings")
      .update({ next_visit: date, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return { ok: false, error: error.message };
    if (partner && date) {
      const nice = new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      notifyLater(partner.id, { title: "🗓️ Countdown set!", body: `${me.display_name} set the next visit: ${nice}`, url: "/" });
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved ✓" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Marks notes I've received as read (used when opening the Notes page). */
export async function markNotesRead(): Promise<void> {
  const { me } = await ctx();
  const admin = createAdminClient();
  await admin
    .from("notes")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", me.id)
    .is("read_at", null)
    .not("delivered_at", "is", null);
}
