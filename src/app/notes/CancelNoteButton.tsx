"use client";
import { useTransition } from "react";
import { cancelNote } from "@/app/actions";

export default function CancelNoteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="shrink-0 rounded-xl px-2 py-1 text-xs font-semibold text-muted underline"
      disabled={pending}
      onClick={() => start(async () => { await cancelNote(id); })}
    >
      {pending ? "…" : "Cancel"}
    </button>
  );
}
