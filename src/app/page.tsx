import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import PushSetup from "@/components/PushSetup";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-sm text-muted">Hi {me?.display_name || "you"} 👋</p>
          <h1 className="font-display text-3xl font-semibold">Ryan &amp; Evie</h1>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm text-muted underline">Log out</button>
        </form>
      </header>

      <PushSetup partnerName={partner?.display_name ?? null} />

      <div className="card text-center text-muted">
        <p className="text-4xl">🏗️</p>
        <p className="mt-2">The fun stuff lands here next: the thinking-of-you button, notes, goodnights and moods.</p>
      </div>
    </div>
  );
}
