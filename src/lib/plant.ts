import { createAdminClient } from "@/lib/supabase/admin";
import { localDateStr } from "@/lib/time";

const TZ = "Europe/London";

export type Plant = {
  stage: number; // 0..6
  emoji: string;
  name: string;
  points: number; // lifetime "together days"
  nextAt: number | null;
  thirsty: boolean; // nothing together yesterday or today
  wilted: boolean; // nothing together for 3+ days
  todayDone: boolean;
  tip: string;
};

const STAGES = [
  { at: 0, emoji: "🌰", name: "A tiny seed" },
  { at: 1, emoji: "🌱", name: "A little sprout" },
  { at: 5, emoji: "🌿", name: "Growing leaves" },
  { at: 14, emoji: "🪴", name: "A happy houseplant" },
  { at: 30, emoji: "🌳", name: "A proper tree" },
  { at: 60, emoji: "🌸", name: "In full bloom" },
  { at: 120, emoji: "🍒", name: "Bearing fruit" },
];

/**
 * Our shared plant grows one step for every day we BOTH did something together
 * (answered the question, played the word, swapped photos, or said goodnight to each other).
 */
export async function getPlant(meId: string, partnerId: string | null): Promise<Plant> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 400 * 86400000).toISOString();
  const [q, w, p, g] = await Promise.all([
    admin.from("question_answers").select("user_id, qdate"),
    admin.from("word_results").select("user_id, wdate").eq("done", true),
    admin.from("photo_swaps").select("user_id, pdate"),
    admin.from("goodnights").select("user_id, created_at").gte("created_at", since),
  ]);

  // Each activity counts per person per day; a day counts when both people did the same activity.
  const both = new Set<string>();
  const collect = (rows: { user_id: string; day: string }[]) => {
    const m = new Map<string, Set<string>>();
    for (const r of rows) {
      const s = m.get(r.day) ?? new Set<string>();
      s.add(r.user_id);
      m.set(r.day, s);
    }
    for (const [day, s] of m) if (partnerId && s.has(meId) && s.has(partnerId)) both.add(day);
  };
  collect((q.data ?? []).map((r) => ({ user_id: r.user_id, day: r.qdate })));
  collect((w.data ?? []).map((r) => ({ user_id: r.user_id, day: r.wdate })));
  collect((p.data ?? []).map((r) => ({ user_id: r.user_id, day: r.pdate })));
  // Goodnights: count the evening they belong to (subtract 6h so 1am still counts as "last night")
  collect(
    (g.data ?? []).map((r) => ({
      user_id: r.user_id,
      day: localDateStr(new Date(new Date(r.created_at).getTime() - 6 * 3600000), TZ),
    }))
  );

  const today = localDateStr(new Date(), TZ);
  const yesterday = localDateStr(new Date(Date.now() - 86400000), TZ);
  const points = both.size;
  let stageIdx = 0;
  STAGES.forEach((s, i) => {
    if (points >= s.at) stageIdx = i;
  });
  const sorted = [...both].sort();
  const last = sorted[sorted.length - 1];
  const daysSinceLast = last
    ? Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(last + "T12:00:00Z")) / 86400000)
    : 999;
  const todayDone = both.has(today);
  const thirsty = !todayDone && !both.has(yesterday);
  const wilted = points > 0 && daysSinceLast >= 3;
  const next = STAGES[stageIdx + 1];

  return {
    stage: stageIdx,
    emoji: wilted ? "🥀" : STAGES[stageIdx].emoji,
    name: wilted ? "Feeling a bit droopy" : STAGES[stageIdx].name,
    points,
    nextAt: next ? next.at : null,
    thirsty,
    wilted,
    todayDone,
    tip: todayDone
      ? "Watered today 💧 — you both showed up."
      : "Water it: both answer the question, play the word, swap photos or say goodnight.",
  };
}
