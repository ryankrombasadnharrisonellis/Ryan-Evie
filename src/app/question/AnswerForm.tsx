"use client";
import { useState, useTransition } from "react";
import { answerQuestion } from "@/app/actions";

export default function AnswerForm() {
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <textarea
        className="input min-h-[110px] resize-none"
        placeholder="Your answer…"
        maxLength={1000}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <button
        className="btn-primary w-full"
        disabled={pending || !answer.trim()}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await answerQuestion(answer);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {pending ? "Saving…" : "Answer & reveal 🔓"}
      </button>
      {error && <p className="text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
