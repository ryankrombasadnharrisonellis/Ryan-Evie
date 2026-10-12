import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMeAndPartner } from "@/lib/people";
import { startOfLocalDay, timeAgo } from "@/lib/time";
import { getWeather } from "@/lib/weather";
import { KIND_LABEL, questionFor, todayQDate } from "@/lib/questions";
import PushSetup from "@/components/PushSetup";
import LoveButtons from "@/components/LoveButtons";
import MoodCard from "@/components/MoodCard";
import GoodnightCard from "@/components/GoodnightCard";
import Clocks from "@/components/Clocks";
import Countdown from "@/components/Countdown";
import ScoreboardCard from "@/components/ScoreboardCard";
import UsCard from "@/components/UsCard";
import PlantCard from "@/components/PlantCard";
import { getPlant } from "@/lib/plant";
import { dayTogether, distanceKm, nextAnniversary, nextMilestone } from "@/lib/us";
import { todayPDate } from "@/lib/photos";
import { getScoreboard } from "@/lib/scores";

export const dynamic = "force-dynamic";

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function Home() {
  const supabase = await createClient();
  const { me, partner } = await getMeAndPartner(supabase);
  if (!me) return null;

  const partnerName = partner?.display_name || "your person";
  const dayStart = startOfLocalDay(me.timezone).toISOString();
  const nightWindow = new Date(Date.now() - 14 * 3600 * 1000).toISOString();
  const qdate = todayQDate();
  const question = questionFor(qdate);

  const [pingsRes, moodsRes, notesRes, gnRes, settingsRes, answeredRes, myWeather, partnerWeather, board, myTurnRes, plant, myPhotoRes] = await Promise.all([
    supabase.from("pings").select("sender_id").gte("created_at", dayStart),
    supabase.from("moods").select("user_id, emoji, note, created_at").order("created_at", { ascending: false }).limit(20),
    supabase
      .from("notes")
      .select("id, body, delivered_at, read_at")
      .eq("recipient_id", me.id)
      .not("delivered_at", "is", null)
      .order("delivered_at", { ascending: false })
      .limit(1),
    supabase.from("goodnights").select("user_id, created_at").gte("created_at", nightWindow).order("created_at"),
    supabase.from("couple_settings").select("next_visit, together_since").eq("id", 1).maybeSingle(),
    supabase.rpc("answered_today", { d: qdate }),
    getWeather(me.latitude, me.longitude),
    partner ? getWeather(partner.latitude, partner.longitude) : Promise.resolve(null),
    getScoreboard(me.id, partner?.id ?? null),
    supabase.from("games").select("id", { count: "exact", head: true }).eq("status", "active").eq("turn", me.id),
    getPlant(me.id, partner?.id ?? null),
    supabase.from("photo_swaps").select("id").eq("pdate", todayPDate()).maybeSingle(),
  ]);
  const postedPhoto = !!myPhotoRes.data;
  const since = settingsRes.data?.together_since ?? null;
  const day = since ? dayTogether(since, me.timezone) : null;
  const km =
    partner && me.latitude != null && me.longitude != null && partner.latitude != null && partner.longitude != null
      ? distanceKm({ lat: me.latitude, lon: me.longitude }, { lat: partner.latitude, lon: partner.longitude })
      : null;
  const myTurns = myTurnRes.count ?? 0;

  const pings = pingsRes.data ?? [];
  const sentToday = pings.filter((p) => p.sender_id === me.id).length;
  const receivedToday = pings.length - sentToday;

  const moods = moodsRes.data ?? [];
  const partnerMood = moods.find((m) => m.user_id === partner?.id) ?? null;
  const myMood = moods.find((m) => m.user_id === me.id) ?? null;

  const latestNote = notesRes.data?.[0] ?? null;

  const gns = gnRes.data ?? [];
  const myGn = gns.find((g) => g.user_id === me.id);
  const partnerGn = gns.find((g) => g.user_id === partner?.id);
  const pairKey = myGn && partnerGn ? `${myGn.created_at}|${partnerGn.created_at}` : null;

  const answeredIds = ((answeredRes.data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  const iAnswered = answeredIds.includes(me.id);
  const theyAnswered = partner ? answeredIds.includes(partner.id) : false;

  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: me.timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm text-muted">{greeting(hour)}, {me.display_name} 👋</p>
          <h1 className="font-display text-3xl font-semibold">Ryan &amp; Evie</h1>
        </div>
        <Link href="/settings" prefetch={true} className="rounded-full bg-card p-2.5 text-xl shadow-soft" aria-label="Settings">
          ⚙️
        </Link>
      </header>

      <PushSetup partnerName={partner?.display_name ?? null} compact />

      <Countdown nextVisit={settingsRes.data?.next_visit ?? null} timezone={me.timezone} />

      <UsCard
        day={day}
        milestone={day !== null ? nextMilestone(day) : null}
        anniversary={since ? nextAnniversary(since, me.timezone) : null}
        km={km}
      />

      <Clocks
        people={[
          { name: me.display_name, timezone: me.timezone, city: me.city, weather: myWeather },
          ...(partner ? [{ name: partner.display_name, timezone: partner.timezone, city: partner.city, weather: partnerWeather }] : []),
        ]}
      />

      <LoveButtons partnerName={partnerName} sentToday={sentToday} receivedToday={receivedToday} />

      {!postedPhoto && (
        <Link href="/photos" className="card flex items-center gap-3">
          <span className="text-3xl">📸</span>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">Today&apos;s photo swap</p>
            <p className="text-sm text-muted">Post a photo of your day to unlock {partnerName}&apos;s.</p>
          </div>
          <span className="text-muted">›</span>
        </Link>
      )}

      <MoodCard partnerName={partnerName} partnerMood={partnerMood} myMood={myMood} />

      {latestNote && (
        <Link href="/notes" className="card block">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted">💌 Latest note from {partnerName}</p>
            {!latestNote.read_at && <span className="rounded-full bg-rose px-2 py-0.5 text-[11px] font-bold text-white">NEW</span>}
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap font-display text-lg leading-snug">{latestNote.body}</p>
          <p className="mt-1 text-xs text-muted">{timeAgo(new Date(latestNote.delivered_at))}</p>
        </Link>
      )}

      <Link href="/question" className="card block">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted">Question of the day · {KIND_LABEL[question.kind]}</p>
          {iAnswered && theyAnswered ? (
            <span className="rounded-full bg-rose px-2 py-0.5 text-[11px] font-bold text-white">REVEAL</span>
          ) : null}
        </div>
        <p className="font-display text-lg font-semibold leading-snug">{question.text}</p>
        <p className="mt-1 text-sm text-muted">
          {iAnswered && theyAnswered
            ? "You've both answered — tap to see 👀"
            : iAnswered
              ? `Waiting for ${partnerName}…`
              : theyAnswered
                ? `${partnerName} has answered — your turn ✍️`
                : "Tap to answer"}
        </p>
      </Link>

      {myTurns > 0 && (
        <Link href="/play" className="card flex items-center gap-3 bg-rose/10 ring-2 ring-rose">
          <span className="text-3xl">🎮</span>
          <p className="flex-1 font-display text-lg font-semibold">
            {myTurns === 1 ? "It's your move in a game" : `It's your move in ${myTurns} games`}
          </p>
          <span className="text-rose">›</span>
        </Link>
      )}

      <PlantCard plant={plant} />

      <ScoreboardCard board={board} meName={me.display_name} partnerName={partnerName} compact />

      <GoodnightCard partnerName={partnerName} meDone={!!myGn} partnerDone={!!partnerGn} pairKey={pairKey} />
    </div>
  );
}
