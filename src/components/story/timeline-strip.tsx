import type { Item, Source } from "@/engine/types";
import { cn } from "@/lib/utils";

/** 48 小时时间条：每条报道是一根刻度，越靠右越新；铜绿 = 一手信源。 */
export function TimelineStrip({ items, sources, now, hours = 48, className }: { items: Item[]; sources: Map<string, Source>; now: number; hours?: number; className?: string }) {
  return (
    <div className={cn("relative h-5 border-b border-rule", className)} aria-hidden>
      {[0.25, 0.5, 0.75].map((p) => (
        <span key={p} className="absolute bottom-0 h-1.5 w-px bg-rule" style={{ left: `${p * 100}%` }} />
      ))}
      {items.map((i) => {
        const ageH = (now - Date.parse(i.publishedAt)) / 3600_000;
        if (ageH > hours || ageH < 0) return null;
        return (
          <span
            key={i.id}
            className={cn("absolute bottom-0 h-4 w-[3px] -translate-x-1/2", sources.get(i.sourceId)?.tier === "T1" ? "bg-verdigris" : "bg-ink")}
            style={{ left: `${(1 - ageH / hours) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
