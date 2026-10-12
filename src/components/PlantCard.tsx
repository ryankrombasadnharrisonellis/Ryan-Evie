import type { Plant } from "@/lib/plant";

export default function PlantCard({ plant }: { plant: Plant }) {
  const pct = plant.nextAt ? Math.min(100, Math.round((plant.points / plant.nextAt) * 100)) : 100;
  return (
    <section className={`card flex items-center gap-4 ${plant.wilted ? "bg-line/30" : "bg-gradient-to-br from-[#b8e0c2]/35 via-card to-card"}`}>
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-card text-5xl shadow-soft">
        <span className={plant.todayDone ? "animate-pop" : ""}>{plant.emoji}</span>
        {plant.todayDone && <span className="absolute -right-1 -top-1 text-lg">💧</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-muted">Our little plant</p>
        <p className="font-display text-lg font-semibold leading-snug">{plant.name}</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-[#6BAA75] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {plant.points} day{plant.points === 1 ? "" : "s"} together
          {plant.nextAt ? ` · grows at ${plant.nextAt}` : " · fully grown!"}
        </p>
        <p className="mt-1 text-xs">{plant.thirsty && !plant.todayDone ? "🥤 Thirsty! " : ""}{plant.tip}</p>
      </div>
    </section>
  );
}
