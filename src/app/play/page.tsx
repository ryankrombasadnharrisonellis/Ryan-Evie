import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import { getScoreboard } from "@/lib/scores";
import { GAME_INFO, type GameType } from "@/lib/games";
import { todayWDate } from "@/lib/words";
import { timeAgo } from "@/lib/time";
import ScoreboardCard from "@/components/ScoreboardCard";
import NewGameButtons from "@/components/games/NewGameButtons";

export const dynamic = "force-dynamic";

type G = { id: string; type: GameType; turn: string | null; status: string; winner: string | null; created_by: string; updated_at: string };

export default async function PlayPage() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const partnerName = partner?.display_name || "your person";
  const wdate = todayWDate();

  const [board, gamesRes, wordRes] = await Promise.all([
    getScoreboard(me.id, partner?.id ?? null),
    supabase.from("games").select("id, type, turn, status, winner, created_by, updated_at").order("updated_at", { ascending: false }).limit(40),
    supabase.from("word_results").select("guesses, solved, done").eq("wdate", wdate).maybeSingle(),
  ]);
  const games = (gamesRes.data ?? []) as G[];
  const active = games.filter((g) => g.status === "active").sort((a, b) => Number(b.turn === me.id) - Number(a.turn === me.id));
  const finished = games.filter((g) => g.status === "finished").slice(0, 8);
  const word = wordRes.data;

  function label(g: G) {
    if (g.type === "draw" && g.turn === me!.id && g.created_by === me!.id) return "Your turn to draw";
    if (g.type === "quiz" && g.created_by === me!.id) return `Waiting for ${partnerName} to answer`;
    return g.turn === me!.id ? "Your move" : `Waiting for ${partnerName}`;
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-semibold">Play 🎲</h1>
        <p className="text-sm text-muted">Take turns whenever you&apos;re free.</p>
      </header>

      <Link href="/play/word" className="card block bg-gradient-to-br from-[#b8e0c2]/40 via-card to-card">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🟩</span>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">Daily word</p>
            <p className="text-sm text-muted">
              {word?.done
                ? word.solved
                  ? `You got it in ${(word.guesses as string[]).length} — see how ${partnerName} did`
                  : "Not today — see the answer and results"
                : word?.guesses?.length
                  ? `${(word.guesses as string[]).length}/6 guesses used — keep going`
                  : "Same five-letter word for both of you. Fewer guesses wins."}
            </p>
          </div>
          <span className="text-muted">›</span>
        </div>
      </Link>

      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Ongoing</h2>
          {active.map((g) => (
            <Link key={g.id} href={`/play/${g.id}`} className={`card flex items-center gap-3 p-4 ${g.turn === me.id ? "ring-2 ring-rose" : ""}`}>
              <span className="text-2xl">{GAME_INFO[g.type].emoji}</span>
              <div className="flex-1">
                <p className="font-semibold">{GAME_INFO[g.type].name}</p>
                <p className={`text-sm ${g.turn === me.id ? "font-semibold text-rose" : "text-muted"}`}>{label(g)}</p>
              </div>
              <span className="text-xs text-muted">{timeAgo(new Date(g.updated_at))}</span>
            </Link>
          ))}
        </section>
      )}

      <NewGameButtons />

      <ScoreboardCard board={board} meName={me.display_name} partnerName={partnerName} />

      {finished.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Recent results</h2>
          {finished.map((g) => (
            <Link key={g.id} href={`/play/${g.id}`} className="card flex items-center gap-3 p-4">
              <span className="text-2xl">{GAME_INFO[g.type].emoji}</span>
              <p className="flex-1 font-semibold">{GAME_INFO[g.type].name}</p>
              <span className="text-sm text-muted">
                {g.winner === me.id ? "You won 🏆" : g.winner ? `${partnerName} won` : "Draw"}
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
