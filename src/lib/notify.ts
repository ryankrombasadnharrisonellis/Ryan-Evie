import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser, type PushPayload } from "@/lib/push";
import { quietUntil } from "@/lib/time";

/**
 * Send a push to someone, unless it's their quiet hours — then it waits in a queue
 * and goes out when quiet hours end. Several "love taps" queued overnight are merged
 * into one friendly summary instead of 20 notifications at 8am.
 */
export async function notify(userId: string, payload: PushPayload, opts: { respectQuietHours?: boolean; senderName?: string } = {}) {
  const respect = opts.respectQuietHours ?? true;
  const admin = createAdminClient();

  if (respect) {
    const { data: p } = await admin
      .from("profiles")
      .select("timezone, quiet_start, quiet_end")
      .eq("id", userId)
      .single();
    const until = p ? quietUntil(new Date(), p.timezone, p.quiet_start, p.quiet_end) : null;
    if (until) {
      if (payload.tag === "ping") {
        const { data: queued } = await admin
          .from("push_queue")
          .select("id")
          .eq("user_id", userId)
          .eq("payload->>tag", "ping");
        const count = (queued?.length ?? 0) + 1;
        if (queued?.length) {
          await admin.from("push_queue").delete().in("id", queued.map((q) => q.id));
        }
        const merged: PushPayload =
          count > 1
            ? {
                ...payload,
                title: "💗 While you were sleeping…",
                body: `${opts.senderName ?? "Someone"} sent you ${count} little loves.`,
              }
            : payload;
        await admin.from("push_queue").insert({ user_id: userId, payload: merged, send_after: until.toISOString() });
      } else {
        await admin.from("push_queue").insert({ user_id: userId, payload, send_after: until.toISOString() });
      }
      return { sent: 0, queuedUntil: until };
    }
  }

  const sent = await sendPushToUser(userId, payload);
  return { sent, queuedUntil: null as Date | null };
}
