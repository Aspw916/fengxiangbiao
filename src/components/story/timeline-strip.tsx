import type { Item, Source } from "@/engine/types";
import { cn } from "@/lib/utils";

/** 48 小时时间条：每篇报道一根刻度，越靠右越新；亮色 = 一手信源。 */
export function TimelineStrip({ items, sources, now, hours = 48, className }: { items: Item[]; sources: Map<string, Source>; now: number; hours?: number; className?: string }) {
  return (
    <div className={cn("relative h-6 rounded-md bg-surface", className)} aria-hidden>
      {items.map((i) => {
        const ageH = (now - Date.parse(i.publishedAt)) / 3600_000;
        if (ageH > hours || ageH < 0) return null;
        return (
          <span
            key={i.id}
            className={cn("absolute top-1.5 bottom-1.5 w-0.5 -translate-x-1/2 rounded-full", sources.get(i.sourceId)?.tier === "T1" ? "bg-fg" : "bg-faint")}
            style={{ left: `${4 + (1 - ageH / hours) * 92}%` }}
          />
        );
      })}
    </div>
  );
}
