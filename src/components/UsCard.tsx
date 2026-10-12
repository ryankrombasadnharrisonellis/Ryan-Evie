import Link from "next/link";

export default function UsCard({
  day,
  milestone,
  anniversary,
  km,
}: {
  day: number | null;
  milestone: number | null;
  anniversary: { years: number; days: number } | null;
  km: number | null;
}) {
  if (day === null && km === null) {
    return (
      <Link href="/settings#us" className="card block text-center">
        <p className="text-3xl">💞</p>
        <p className="font-display text-lg font-semibold">When did you two get together?</p>
        <p className="text-sm text-muted">Add the date to see your days together and anniversary countdown.</p>
      </Link>
    );
  }
  return (
    <section className="grid grid-cols-3 gap-2">
      <div className="card p-3 text-center">
        <p className="font-display text-2xl font-semibold tabular-nums text-rose">{day !== null ? day.toLocaleString("en-GB") : "–"}</p>
        <p className="text-[11px] font-semibold text-muted">days together</p>
        {milestone && day !== null && <p className="mt-1 text-[10px] text-muted">{milestone - day} to day {milestone.toLocaleString("en-GB")} 🎉</p>}
      </div>
      <div className="card p-3 text-center">
        <p className="font-display text-2xl font-semibold tabular-nums">{km !== null ? km.toLocaleString("en-GB") : "–"}</p>
        <p className="text-[11px] font-semibold text-muted">km apart</p>
        {km !== null && <p className="mt-1 text-[10px] text-muted">{km < 50 ? "basically together 🥰" : "but close at heart"}</p>}
      </div>
      <div className="card p-3 text-center">
        <p className="font-display text-2xl font-semibold tabular-nums">{anniversary ? (anniversary.days === 0 ? "🎂" : anniversary.days) : "–"}</p>
        <p className="text-[11px] font-semibold text-muted">{anniversary?.days === 0 ? "anniversary today!" : "days to anniversary"}</p>
        {anniversary && anniversary.days !== 0 && <p className="mt-1 text-[10px] text-muted">{anniversary.years} year{anniversary.years === 1 ? "" : "s"} 💍</p>}
      </div>
    </section>
  );
}
