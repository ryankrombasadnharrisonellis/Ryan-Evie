/** Shown instantly while a page loads, so taps on the bottom bar feel immediate. */
export default function PageSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-4 pb-24">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
      </header>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded-full bg-line" />
          <div className="h-6 w-4/5 rounded-full bg-line" />
          <div className="h-4 w-2/3 rounded-full bg-line" />
        </div>
      ))}
    </div>
  );
}
