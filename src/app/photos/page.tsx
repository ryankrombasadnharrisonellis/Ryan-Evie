import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeAndPartner } from "@/lib/people";
import { signedUrls } from "@/lib/media";
import { todayPDate } from "@/lib/photos";
import PhotoUploader from "@/components/PhotoUploader";

export const dynamic = "force-dynamic";

type Row = { user_id: string; pdate: string; path: string; caption: string | null; created_at: string };

function niceDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function Polaroid({ url, name, caption, tilt }: { url: string; name: string; caption: string | null; tilt: string }) {
  return (
    <figure className={`rounded-2xl bg-white p-2 pb-3 shadow-soft ${tilt}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`${name}'s photo`} className="aspect-[4/5] w-full rounded-xl object-cover" loading="lazy" />
      <figcaption className="mt-2 px-1 text-xs text-[#3A2A30]">
        <b>{name}</b>
        {caption ? ` · ${caption}` : ""}
      </figcaption>
    </figure>
  );
}

export default async function PhotosPage() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;
  const partnerName = partner?.display_name || "your person";
  const today = todayPDate();

  // Server reads both people's rows, but only reveals the partner's photo on days we've both posted.
  const { data } = await createAdminClient()
    .from("photo_swaps")
    .select("user_id, pdate, path, caption, created_at")
    .order("pdate", { ascending: false })
    .limit(400);
  const rows = (data ?? []) as Row[];
  const byDay = new Map<string, { mine?: Row; theirs?: Row }>();
  for (const r of rows) {
    const d = byDay.get(r.pdate) ?? {};
    if (r.user_id === me.id) d.mine = r;
    else d.theirs = r;
    byDay.set(r.pdate, d);
  }
  const todayRow = byDay.get(today) ?? {};
  const unlocked = (d: { mine?: Row; theirs?: Row }) => !!d.mine && !!d.theirs;

  const visiblePaths: string[] = [];
  for (const [, d] of byDay) {
    if (d.mine) visiblePaths.push(d.mine.path);
    if (unlocked(d) && d.theirs) visiblePaths.push(d.theirs.path);
  }
  const urls = await signedUrls(visiblePaths);
  const past = [...byDay.entries()].filter(([day, d]) => day !== today && unlocked(d));

  return (
    <div className="space-y-4 pb-24">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-semibold">Photo swap 📸</h1>
        <p className="text-sm text-muted">One photo each a day. They unlock when you&apos;ve both posted.</p>
      </header>

      {!todayRow.mine ? (
        <PhotoUploader partnerName={partnerName} partnerPosted={!!todayRow.theirs} />
      ) : (
        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Polaroid url={urls[todayRow.mine.path]} name="You" caption={todayRow.mine.caption} tilt="-rotate-2" />
            {todayRow.theirs ? (
              <div className="animate-fadeIn">
                <Polaroid url={urls[todayRow.theirs.path]} name={partnerName} caption={todayRow.theirs.caption} tilt="rotate-2" />
              </div>
            ) : (
              <div className="flex rotate-2 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line p-4 text-center text-sm text-muted">
                <span className="text-3xl">⏳</span>
                Waiting for {partnerName}&apos;s photo
              </div>
            )}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-muted">📔 Our diary · {past.length} day{past.length === 1 ? "" : "s"}</h2>
          {past.map(([day, d]) => (
            <div key={day} className="card space-y-2 p-3">
              <p className="px-1 text-xs font-semibold text-muted">{niceDate(day)}</p>
              <div className="grid grid-cols-2 gap-3">
                <Polaroid url={urls[d.mine!.path]} name="You" caption={d.mine!.caption} tilt="-rotate-1" />
                <Polaroid url={urls[d.theirs!.path]} name={partnerName} caption={d.theirs!.caption} tilt="rotate-1" />
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
