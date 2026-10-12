import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { notify } from "@/lib/notify";
import { tzParts } from "@/lib/time";
import { todayQDate } from "@/lib/questions";

/** Runs every minute on the server: delivers scheduled notes, flushes quiet-hours queue, sends reminders. */
export async function runJobs() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: profiles } = await admin.from("profiles").select("id, display_name, timezone");
  const people = profiles ?? [];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.display_name || "Your person";

  // 1. Scheduled notes that are due
  const { data: due } = await admin
    .from("notes")
    .select("id, sender_id, recipient_id, body")
    .is("delivered_at", null)
    .lte("deliver_at", now.toISOString())
    .limit(50);
  for (const n of due ?? []) {
    const { data: claimed } = await admin
      .from("notes")
      .update({ delivered_at: now.toISOString() })
      .eq("id", n.id)
      .is("delivered_at", null)
      .select("id");
    if (!claimed?.length) continue; // someone else delivered it
    await notify(n.recipient_id, {
      title: `💌 A note from ${nameOf(n.sender_id)}`,
      body: n.body.length > 140 ? n.body.slice(0, 137) + "…" : n.body,
      url: "/notes",
    });
  }

  // 2. Pushes that were waiting for quiet hours to end
  const { data: queued } = await admin
    .from("push_queue")
    .select("id, user_id, payload")
    .lte("send_after", now.toISOString())
    .limit(50);
  for (const q of queued ?? []) {
    const { data: removed } = await admin.from("push_queue").delete().eq("id", q.id).select("id");
    if (!removed?.length) continue;
    await sendPushToUser(q.user_id, q.payload as PushPayload);
  }

  // 3. Daily question nudge: at 8pm local time, if your person has answered and you haven't
  const qdate = todayQDate(now);
  const { data: answers } = await admin.from("question_answers").select("user_id").eq("qdate", qdate);
  const answered = new Set((answers ?? []).map((a) => a.user_id));
  for (const p of people) {
    if (answered.has(p.id)) continue;
    const other = people.find((x) => x.id !== p.id);
    if (!other || !answered.has(other.id)) continue;
    const hour = tzParts(now, p.timezone).hour;
    if (hour < 20 || hour >= 23) continue;
    const { error } = await admin.from("reminders_sent").insert({ user_id: p.id, kind: "question", ref_date: qdate });
    if (error) continue; // already reminded today
    await notify(p.id, {
      title: "❓ Today's question is waiting",
      body: `${other.display_name} has answered — answer yours to see what they said 👀`,
      url: "/question",
      tag: "question",
    });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __reScheduler: NodeJS.Timeout | undefined;
}

export function startScheduler() {
  if (globalThis.__reScheduler) return;
  const tick = async () => {
    try {
      await runJobs();
    } catch (e) {
      console.error("[scheduler]", e);
    }
  };
  globalThis.__reScheduler = setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
  console.log("[scheduler] started");
}
