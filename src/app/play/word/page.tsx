import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { WORD_MAX_GUESSES, answerFor, scoreGuess, todayWDate, type LetterResult } from "@/lib/words";
import WordGame from "@/components/games/WordGame";

export const dynamic = "force-dynamic";

const EMOJI: Record<LetterResult, string> = { correct: "🟩", present: "🟨", absent: "⬜" };

export default async function WordPage() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const partnerName = partner?.display_name || "your person";
  const wdate = todayWDate();
  const answer = answerFor(wdate);

  const admin = createAdminClient();
  const { data: rows } = await admin.from("word_results").select("user_id, guesses, solved, done").eq("wdate", wdate);
  const mine = rows?.find((r) => r.user_id === me.id);
  const theirs = rows?.find((r) => r.user_id === partner?.id);
  const myGuesses = (mine?.guesses as string[]) ?? [];
  const done = !!mine?.done;

  const myRows = myGuesses.map((w) => ({ word: w, result: scoreGuess(w, answer) }));
  const theirGrid = done && theirs?.done ? ((theirs.guesses as string[]) ?? []).map((w) => scoreGuess(w, answer).map((r) => EMOJI[r]).join("")) : null;

  let verdict = "";
  if (done && theirs?.done) {
    const a = mine?.solved ? myGuesses.length : 99;
    const b = theirs.solved ? (theirs.guesses as string[]).length : 99;
    verdict = a < b ? "You win today! 🏆" : b < a ? `${partnerName} wins today` : "A tie today 🤝";
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/play" className="text-2xl text-muted">‹</Link>
        <div>
          <h1 className="font-display text-3xl font-semibold">Daily word 🟩</h1>
          <p className="text-sm text-muted">Same word for both of you · {WORD_MAX_GUESSES} guesses</p>
        </div>
      </header>

      <WordGame rows={myRows} done={done} maxGuesses={WORD_MAX_GUESSES} />

      {done && (
        <section className="card space-y-3 text-center animate-fadeIn">
          <p className="font-display text-xl font-semibold">
            {mine?.solved ? `Got it in ${myGuesses.length}! 🎉` : "So close…"} The word was <span className="uppercase text-rose">{answer}</span>
          </p>
          {theirGrid ? (
            <>
              <p className="text-sm font-semibold text-muted">{partnerName}&apos;s board</p>
              <div className="font-mono text-xl leading-tight">
                {theirGrid.map((r, i) => (
                  <div key={i}>{r}</div>
                ))}
              </div>
              <p className="font-display text-lg font-semibold">{verdict}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Waiting for {partnerName} to play — you&apos;ll get a notification when they finish.</p>
          )}
        </section>
      )}
      <p className="text-center text-xs text-muted">A new word every day at midnight UK time.</p>
    </div>
  );
}
