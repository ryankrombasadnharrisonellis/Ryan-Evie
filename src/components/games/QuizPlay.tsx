"use client";
import { useState, useTransition } from "react";
import { answerQuiz } from "@/app/play/actions";
import type { QuizQuestion } from "@/lib/games";

export default function QuizPlay({ gameId, questions, partnerName }: { gameId: string; questions: QuizQuestion[]; partnerName: string }) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = answers.every((a) => a !== null);

  return (
    <div className="space-y-3">
      <div className="card py-3">
        <p className="font-display text-lg font-semibold">How well do you know {partnerName}?</p>
        <p className="text-sm text-muted">Get 60% or more to win.</p>
      </div>
      {questions.map((q, i) => (
        <section key={i} className="card space-y-2">
          <p className="font-semibold">{i + 1}. {q.q}</p>
          <div className="grid gap-2">
            {q.options.map((o, k) => (
              <button
                key={k}
                onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))}
                className={`rounded-2xl px-4 py-3 text-left transition active:scale-[0.98] ${answers[i] === k ? "bg-rose text-white" : "bg-line/50"}`}
              >
                {o}
              </button>
            ))}
          </div>
        </section>
      ))}
      <button
        className="btn-primary w-full"
        disabled={!done || pending}
        onClick={() =>
          start(async () => {
            const r = await answerQuiz(gameId, answers as number[]);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {pending ? "Marking…" : done ? "Submit answers" : `${answers.filter((a) => a !== null).length}/${questions.length} answered`}
      </button>
      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
