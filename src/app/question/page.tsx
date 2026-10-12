import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import { KIND_LABEL, QUESTIONS, questionFor, todayQDate } from "@/lib/questions";
import AnswerForm from "./AnswerForm";

export const dynamic = "force-dynamic";

function niceDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default async function QuestionPage() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const partnerName = partner?.display_name || "your person";

  const qdate = todayQDate();
  const q = questionFor(qdate);

  const [{ data: answers }, { data: answeredToday }] = await Promise.all([
    supabase
      .from("question_answers")
      .select("user_id, qdate, question_index, answer, created_at")
      .order("qdate", { ascending: false })
      .limit(400),
    supabase.rpc("answered_today", { d: qdate }),
  ]);
  const all = answers ?? [];
  const mineToday = all.find((a) => a.qdate === qdate && a.user_id === me.id);
  const theirsToday = all.find((a) => a.qdate === qdate && a.user_id === partner?.id);
  const theyAnswered = ((answeredToday ?? []) as { user_id: string }[]).some((r) => r.user_id === partner?.id);

  // Archive: past days, grouped
  type Row = { index: number; mine?: string; theirs?: string };
  const byDate = new Map<string, Row>();
  for (const a of all) {
    if (a.qdate === qdate) continue;
    const row: Row = byDate.get(a.qdate) ?? { index: a.question_index };
    if (a.user_id === me.id) row.mine = a.answer;
    else row.theirs = a.answer;
    byDate.set(a.qdate, row);
  }
  const archive = [...byDate.entries()];

  return (
    <div className="space-y-4 pb-24">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-semibold">Question of the day</h1>
        <p className="text-sm text-muted">Answer to unlock {partnerName}&apos;s answer.</p>
      </header>

      <section className="card space-y-4 bg-gradient-to-br from-peach/20 via-card to-sky/15">
        <p className="text-sm font-semibold text-muted">{KIND_LABEL[q.kind]} · {niceDate(qdate)}</p>
        <p className="font-display text-2xl font-semibold leading-snug">{q.text}</p>

        {!mineToday ? (
          <>
            <p className="text-sm text-muted">
              {theyAnswered ? `🔒 ${partnerName} has answered. Answer yours to see it.` : `${partnerName} hasn't answered yet.`}
            </p>
            <AnswerForm />
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl bg-card/80 p-4">
              <p className="text-xs font-semibold text-muted">You</p>
              <p className="whitespace-pre-wrap break-words">{mineToday.answer}</p>
            </div>
            <div className="rounded-2xl bg-card/80 p-4">
              <p className="text-xs font-semibold text-muted">{partnerName}</p>
              {theirsToday ? (
                <p className="whitespace-pre-wrap break-words animate-fadeIn">{theirsToday.answer}</p>
              ) : (
                <p className="text-muted">Waiting for {partnerName} to answer… 🔒</p>
              )}
            </div>
          </div>
        )}
      </section>

      {archive.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">📚 Past questions</h2>
          {archive.map(([d, row]) => (
            <details key={d} className="card p-4">
              <summary className="cursor-pointer list-none">
                <p className="text-xs text-muted">{niceDate(d)}</p>
                <p className="font-semibold leading-snug">{QUESTIONS[row.index]?.text ?? "Question"}</p>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <p><b>You:</b> {row.mine ?? <span className="text-muted">didn&apos;t answer</span>}</p>
                <p>
                  <b>{partnerName}:</b>{" "}
                  {row.theirs ?? <span className="text-muted">{row.mine ? "didn't answer" : "answer this day to see it"}</span>}
                </p>
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
