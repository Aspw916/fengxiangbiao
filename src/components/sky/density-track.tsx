"use client";

import { useId, useMemo } from "react";
import { axisU, type SkyEvent } from "@/lib/sky";

const BUCKETS = 60;

/** 时间轴背后的事件密度波形：已走过的部分更亮。 */
export function DensityTrack({ events, now, t }: { events: SkyEvent[]; now: number; t: number }) {
  const clip = useId();
  const path = useMemo(() => {
    const counts = new Array<number>(BUCKETS).fill(0);
    for (const e of events) {
      if (!e.selected || e.first > now || now - e.first > 72 * 3600_000) continue;
      counts[Math.min(BUCKETS - 1, Math.floor(axisU(e.first, now) * BUCKETS))] += 1;
    }
    const max = Math.max(1, ...counts);
    const smooth = counts.map((_, i) => (counts[i - 1] ?? 0) * 0.25 + counts[i] * 0.5 + (counts[i + 1] ?? 0) * 0.25);
    const pts = smooth.map((c, i) => `${(i + 0.5).toFixed(2)},${(1 - (c / max) * 0.95).toFixed(3)}`);
    return `M0,1 L${pts.join(" L")} L${BUCKETS},1 Z`;
  }, [events, now]);
  const u = axisU(t, now);

  return (
    <svg aria-hidden viewBox={`0 0 ${BUCKETS} 1`} preserveAspectRatio="none" className="pointer-events-none absolute inset-x-[7px] bottom-1/2 h-5 w-[calc(100%-14px)]">
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={u * BUCKETS} height={1} />
        </clipPath>
      </defs>
      <path d={path} className="fill-fg/10" />
      <path d={path} className="fill-fg/30" clipPath={`url(#${clip})`} />
    </svg>
  );
}
