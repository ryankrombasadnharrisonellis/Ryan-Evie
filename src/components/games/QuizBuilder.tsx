"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuiz } from "@/app/play/actions";

type Q = { q: string; options: string[]; correct: number };

const IDEAS = [
  "What's my comfort food?",
  "What's my dream holiday destination?",
  "What would I order at a café?",
  "What's my biggest pet peeve?",
  "Which film could I watch forever?",
  "What's my go-to karaoke song?",
  "What was my first job?",
  "What's my favourite season?",
  "What am I most scared of?",
  "What's my ideal Sunday?",
  "Which superpower would I pick?",
  "What's my most-used emoji?",
];

const blank = (q = ""): Q => ({ q, options: ["", "", ""], correct: -1 });

export default function QuizBuilder({ partnerName }: { partnerName: string }) {
  const router = useRouter();
  const [qs, setQs] = useState<Q[]>([blank(), blank(), blank()]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<Q>) {
    setQs((all) => all.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  }
  function setOption(i: number, k: number, v: string) {
    setQs((all) => all.map((q, j) => (j === i ? { ...q, options: q.options.map((o, l) => (l === k ? v : o)) } : q)));
  }
  function useIdea(idea: string) {
    const empty = qs.findIndex((q) => !q.q.trim());
    if (empty >= 0) update(empty, { q: idea });
    else if (qs.length < 15) setQs((all) => [...all, blank(idea)]);
  }

  const ready = qs.filter((q) => q.q.trim() && q.options.filter((o) => o.trim()).length >= 2 && q.correct >= 0 && q.options[q.correct]?.trim()).length;

  function submit() {
    setError(null);
    start(async () => {
      const r = await createQuiz(
        qs.map((q) => {
          // Re-map the right answer after dropping empty options
          const kept = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
          return { q: q.q, options: kept.map((x) => x.o), correct: kept.findIndex((x) => x.i === q.correct) };
        })
      );
      if (r.ok && r.id) router.push(`/play/${r.id}`);
      else if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <p className="text-sm text-muted">
          Write questions about yourself, add a few options and tick the right one. {partnerName} wins if they get at least 60% right; otherwise you do 😏
        </p>
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button key={idea} onClick={() => useIdea(idea)} className="rounded-full bg-line/60 px-3 py-1 text-xs font-semibold">
              + {idea}
            </button>
          ))}
        </div>
      </section>

      {qs.map((q, i) => (
        <section key={i} className="card space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose/15 text-sm font-bold text-rose">{i + 1}</span>
            <input className="input" placeholder="Question about you…" value={q.q} maxLength={140} onChange={(e) => update(i, { q: e.target.value })} />
            {qs.length > 3 && (
              <button className="text-muted" onClick={() => setQs((all) => all.filter((_, j) => j !== i))} aria-label="Remove question">✕</button>
            )}
          </div>
          {q.options.map((o, k) => (
            <div key={k} className="flex items-center gap-2 pl-9">
              <button
                onClick={() => update(i, { correct: k })}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm ${q.correct === k ? "border-rose bg-rose text-white" : "border-line"}`}
                aria-label="Mark as right answer"
              >
                {q.correct === k ? "✓" : ""}
              </button>
              <input className="input py-2" placeholder={`Option ${k + 1}`} value={o} maxLength={60} onChange={(e) => setOption(i, k, e.target.value)} />
            </div>
          ))}
          {q.options.length < 4 && (
            <button className="pl-9 text-sm font-semibold text-muted" onClick={() => update(i, { options: [...q.options, ""] })}>
              + Add option
            </button>
          )}
        </section>
      ))}

      {qs.length < 15 && (
        <button className="btn-ghost w-full" onClick={() => setQs((all) => [...all, blank()])}>+ Another question</button>
      )}
      <button className="btn-primary w-full" disabled={pending || ready < 3} onClick={submit}>
        {pending ? "Sending…" : `Send ${ready} question${ready === 1 ? "" : "s"} to ${partnerName} 🧠`}
      </button>
      {ready < 3 && <p className="text-center text-xs text-muted">Finish at least 3 questions (tick the right answer on each).</p>}
      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
