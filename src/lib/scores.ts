import { createAdminClient } from "@/lib/supabase/admin";
import { GAME_INFO, type GameType } from "@/lib/games";
import { WORD_MAX_GUESSES, todayWDate } from "@/lib/words";
import { todayQDate } from "@/lib/questions";

export type Tally = { me: number; partner: number; draws: number };
export type Scoreboard = {
  perGame: { key: GameType | "word"; name: string; emoji: string; tally: Tally }[];
  total: Tally;
  leader: "me" | "partner" | "tie";
  questionStreak: number;
  wordStreak: number;
};

function prevDay(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd) - 86400000);
  return t.toISOString().slice(0, 10);
}

/** Consecutive days (ending today, or yesterday if today isn't done yet) on which both of us did it. */
function streak(bothDays: Set<string>, today: string) {
  let d = bothDays.has(today) ? today : prevDay(today);
  let n = 0;
  while (bothDays.has(d)) {
    n++;
    d = prevDay(d);
  }
  return n;
}

export async function getScoreboard(meId: string, partnerId: string | null): Promise<Scoreboard> {
  const admin = createAdminClient();
  const [gamesRes, wordsRes, answersRes] = await Promise.all([
    admin.from("games").select("type, winner").eq("status", "finished"),
    admin.from("word_results").select("user_id, wdate, guesses, solved").eq("done", true),
    admin.from("question_answers").select("user_id, qdate"),
  ]);

  const blank = (): Tally => ({ me: 0, partner: 0, draws: 0 });
  const tallies: Record<string, Tally> = { ttt: blank(), c4: blank(), draw: blank(), quiz: blank(), word: blank() };

  for (const g of gamesRes.data ?? []) {
    const t = tallies[g.type];
    if (!t) continue;
    if (g.winner === meId) t.me++;
    else if (g.winner && g.winner === partnerId) t.partner++;
    else t.draws++;
  }

  // Daily word: fewer guesses wins the day
  const byDay = new Map<string, Record<string, number>>();
  for (const w of wordsRes.data ?? []) {
    const row = byDay.get(w.wdate) ?? {};
    row[w.user_id] = w.solved ? (w.guesses as string[]).length : WORD_MAX_GUESSES + 1;
    byDay.set(w.wdate, row);
  }
  const wordBoth = new Set<string>();
  for (const [day, row] of byDay) {
    if (partnerId == null || row[meId] == null || row[partnerId] == null) continue;
    wordBoth.add(day);
    if (row[meId] < row[partnerId]) tallies.word.me++;
    else if (row[partnerId] < row[meId]) tallies.word.partner++;
    else tallies.word.draws++;
  }

  // Daily question streak
  const qByDay = new Map<string, Set<string>>();
  for (const a of answersRes.data ?? []) {
    const s = qByDay.get(a.qdate) ?? new Set<string>();
    s.add(a.user_id);
    qByDay.set(a.qdate, s);
  }
  const qBoth = new Set<string>();
  for (const [day, s] of qByDay) if (s.size >= 2) qBoth.add(day);

  const order: (GameType | "word")[] = ["word", "ttt", "c4", "draw", "quiz"];
  const perGame = order.map((key) => ({ key, ...GAME_INFO[key], tally: tallies[key] }));
  const total = perGame.reduce(
    (acc, g) => ({ me: acc.me + g.tally.me, partner: acc.partner + g.tally.partner, draws: acc.draws + g.tally.draws }),
    blank()
  );

  return {
    perGame,
    total,
    leader: total.me > total.partner ? "me" : total.partner > total.me ? "partner" : "tie",
    questionStreak: streak(qBoth, todayQDate()),
    wordStreak: streak(wordBoth, todayWDate()),
  };
}
