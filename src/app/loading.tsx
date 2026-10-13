export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="正在排版">
      <p className="text-center font-mono text-xs tracking-[0.3em] text-ink-soft">正在排版…</p>
      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="skeleton-ink h-3 w-24 rounded-sm" />
          <div className="skeleton-ink h-10 w-full rounded-sm" />
          <div className="skeleton-ink h-10 w-3/4 rounded-sm" />
          <div className="skeleton-ink h-24 w-full rounded-sm" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton-ink h-12 w-full rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
