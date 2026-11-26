"use client";

import type { SkyReport } from "@/lib/sky";
import { sourcesOf } from "@/lib/sky";

/** 悬停时，每条独立来源绕着星星转。点名字打开原文。 */
export function SourceOrbits({ reports, reduced }: { reports: SkyReport[]; reduced: boolean }) {
  const sats = sourcesOf(reports).slice(0, 6);
  if (!sats.length) return null;
  return (
    <span className="pointer-events-none absolute top-0 left-0 size-0">
      {sats.map((report, i) => {
        const radius = 36 + i * 15;
        const dur = 11 + i * 2.4;
        const angle = (i / sats.length) * 360;
        return (
          <span
            key={report.source}
            className="orbit-arm absolute top-0 left-0"
            style={
              reduced
                ? { transform: `rotate(${angle}deg)` }
                : { animation: `orbit-spin ${dur}s linear infinite`, animationDelay: `${-(i / sats.length) * dur}s` }
            }
          >
            <a
              href={report.url}
              target="_blank"
              rel="noreferrer"
              title={`${report.source}：${report.title}`}
              onClick={(ev) => ev.stopPropagation()}
              onPointerDown={(ev) => ev.stopPropagation()}
              className="orbit-label pointer-events-auto absolute top-[-11px] flex items-center gap-1 rounded-full border border-line bg-bg/90 py-0.5 pr-2 pl-1.5 text-[10px] whitespace-nowrap text-dim shadow-sm backdrop-blur hover:text-fg"
              style={{
                left: radius,
                animation: reduced ? undefined : `orbit-spin-rev ${dur}s linear infinite`,
                animationDelay: reduced ? undefined : `${-(i / sats.length) * dur}s`,
              }}
            >
              <span className={report.tier === "T1" ? "size-1.5 rounded-full bg-fg" : "size-1.5 rounded-full bg-faint"} aria-hidden />
              {report.source}
            </a>
          </span>
        );
      })}
    </span>
  );
}
