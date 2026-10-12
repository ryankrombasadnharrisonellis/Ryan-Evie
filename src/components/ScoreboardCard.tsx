import Link from "next/link";
import type { Scoreboard } from "@/lib/scores";

export default function ScoreboardCard({
  board,
  meName,
  partnerName,
  compact = false,
}: {
  board: Scoreboard;
  meName: string;
  partnerName: string;
  compact?: boolean;
}) {
  const { total, leader } = board;
  const headline =
    leader === "tie"
      ? total.me === 0
        ? "No games yet — first win's up for grabs"
        : `All square at ${total.me}–${total.partner}`
      : `${leader === "me" ? meName : partnerName} leads ${Math.max(total.me, total.partner)}–${Math.min(total.me, total.partner)}`;

  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{leader === "tie" ? "🤝" : "👑"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">Scoreboard</p>
          <p className="font-display text-lg font-semibold leading-snug">{headline}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-peach/25 px-3 py-1">🔥 {board.questionStreak}-day question streak</span>
        <span className="rounded-full bg-sky/25 px-3 py-1">🟩 {board.wordStreak}-day word streak</span>
      </div>
      {!compact && (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-muted">
              <th className="pb-2 text-left font-semibold">Game</th>
              <th className="pb-2 text-center font-semibold">{meName}</th>
              <th className="pb-2 text-center font-semibold">{partnerName}</th>
              <th className="pb-2 text-center font-semibold">Draws</th>
            </tr>
          </thead>
          <tbody>
            {board.perGame.map((g) => (
              <tr key={g.key} className="border-t border-line/70">
                <td className="py-2">{g.emoji} {g.name}</td>
                <td className={`py-2 text-center tabular-nums ${g.tally.me > g.tally.partner ? "font-bold text-rose" : ""}`}>{g.tally.me}</td>
                <td className={`py-2 text-center tabular-nums ${g.tally.partner > g.tally.me ? "font-bold text-rose" : ""}`}>{g.tally.partner}</td>
                <td className="py-2 text-center tabular-nums text-muted">{g.tally.draws}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-line font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-center tabular-nums">{total.me}</td>
              <td className="py-2 text-center tabular-nums">{total.partner}</td>
              <td className="py-2 text-center tabular-nums text-muted">{total.draws}</td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );

  return compact ? (
    <Link href="/play" className="card block">{inner}</Link>
  ) : (
    <section className="card">{inner}</section>
  );
}
