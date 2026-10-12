import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import QuizBuilder from "@/components/games/QuizBuilder";

export default async function NewQuizPage() {
  const supabase = await createClient();
  const { partner } = await getMeAndPartner(supabase);
  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/play" className="text-2xl text-muted">‹</Link>
        <h1 className="font-display text-2xl font-semibold">🧠 Quiz about me</h1>
      </header>
      <QuizBuilder partnerName={partner?.display_name || "your person"} />
    </div>
  );
}
