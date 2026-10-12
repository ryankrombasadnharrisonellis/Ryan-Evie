import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { GAME_INFO, type C4State, type DrawState, type GameType, type QuizState, type TttState } from "@/lib/games";
import BoardGame from "@/components/games/BoardGame";
import DrawPad from "@/components/games/DrawPad";
import DrawGuess from "@/components/games/DrawGuess";
import QuizPlay from "@/components/games/QuizPlay";
import NewGameButtons from "@/components/games/NewGameButtons";

export const dynamic = "force-dynamic";

type Game = {
  id: string;
  type: GameType;
  created_by: string;
  opponent: string;
  turn: string | null;
  status: "active" | "finished";
  winner: string | null;
  state: unknown;
};

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const partnerName = partner?.display_name || "your person";

  const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  const g = data as Game | null;
  if (!g) notFound();

  const finished = g.status === "finished";
  const myTurn = g.turn === me.id;
  const info = GAME_INFO[g.type];

  let body: React.ReactNode = null;

  if (g.type === "ttt" || g.type === "c4") {
    const st = g.state as TttState & C4State;
    body = (
      <BoardGame
        gameId={g.id}
        type={g.type}
        board={st.board}
        myMark={st.marks[me.id]}
        myTurn={myTurn}
        finished={finished}
        iWon={g.winner === me.id}
        theyWon={!!g.winner && g.winner !== me.id}
        partnerName={partnerName}
        last={st.last}
      />
    );
  } else if (g.type === "draw") {
    const st = g.state as DrawState;
    const iDraw = g.created_by === me.id;
    if (!finished && st.phase === "drawing" && iDraw) {
      const { data: secret } = await createAdminClient().from("game_secrets").select("secret").eq("game_id", g.id).single();
      body = <DrawPad gameId={g.id} word={(secret?.secret as { word: string }).word} partnerName={partnerName} />;
    } else if (!finished && st.phase === "drawing") {
      body = <p className="card text-center text-muted">{partnerName} is drawing something for you… ✏️</p>;
    } else if (!finished && !iDraw) {
      body = <DrawGuess gameId={g.id} image={st.image!} guesses={st.guesses ?? []} partnerName={partnerName} />;
    } else {
      // Drawer waiting, or game over
      body = (
        <div className="space-y-3">
          <div className="card py-3 text-center">
            {finished ? (
              <>
                <p className="font-display text-xl font-semibold">
                  {g.winner ? (g.winner === me.id ? "You got it! 🎉" : `${partnerName} guessed it! 🎉`) : "Not guessed this time 🙈"}
                </p>
                <p className="text-sm text-muted">
                  It was <b className="capitalize text-ink">{st.word}</b>
                  {st.guesses?.length ? ` · guesses: ${st.guesses.join(", ")}` : ""}
                </p>
              </>
            ) : (
              <p className="font-display text-lg font-semibold">Sent! Waiting for {partnerName} to guess… ({st.guesses?.length ?? 0}/3 so far)</p>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {st.image && <img src={st.image} alt="Drawing" className="aspect-square w-full rounded-3xl border border-line bg-white shadow-soft" />}
        </div>
      );
    }
  } else if (g.type === "quiz") {
    const st = g.state as QuizState;
    const iWrote = g.created_by === me.id;
    if (!finished && !iWrote) {
      body = <QuizPlay gameId={g.id} questions={st.questions} partnerName={partnerName} />;
    } else if (!finished) {
      body = (
        <div className="card space-y-2">
          <p className="font-display text-lg font-semibold">Waiting for {partnerName} to answer your {st.questions.length} questions…</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            {st.questions.map((q, i) => (
              <li key={i}>{q.q}</li>
            ))}
          </ol>
        </div>
      );
    } else {
      const guesser = iWrote ? partnerName : "You";
      body = (
        <div className="space-y-3">
          <div className="card text-center">
            <p className="font-display text-4xl font-semibold text-rose">
              {st.score}/{st.questions.length}
            </p>
            <p className="font-display text-lg font-semibold">
              {g.winner === me.id
                ? iWrote
                  ? "You stumped them 😏"
                  : "You know them so well 💗"
                : iWrote
                  ? `${partnerName} knows you well 💗`
                  : "They stumped you 😅"}
            </p>
          </div>
          {st.questions.map((q, i) => {
            const right = st.correct?.[i];
            const picked = st.answers?.[i];
            return (
              <section key={i} className="card space-y-2 p-4">
                <p className="font-semibold">{i + 1}. {q.q}</p>
                {q.options.map((o, k) => (
                  <p
                    key={k}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      k === right ? "bg-[#6BAA75]/25 font-semibold" : k === picked ? "bg-rose/20 line-through" : "bg-line/40"
                    }`}
                  >
                    {o}
                    {k === picked && <span className="text-muted"> · {guesser} picked</span>}
                    {k === right && " ✓"}
                  </p>
                ))}
              </section>
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/play" className="text-2xl text-muted">‹</Link>
        <h1 className="font-display text-2xl font-semibold">
          {info.emoji} {info.name}
        </h1>
      </header>
      {body}
      {finished && g.type !== "ttt" && g.type !== "c4" && <NewGameButtons />}
    </div>
  );
}
