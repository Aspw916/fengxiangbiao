"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReportRow {
  id: string;
  url: string;
  title: string;
  originalTitle: string;
  summary: string;
  sourceName: string;
  tier: "T1" | "T2";
  score: number;
  selected: boolean;
  stamp: string;
  publishedAt: string;
}

export function ReportTimeline({ rows }: { rows: ReportRow[] }) {
  const [newestFirst, setNewestFirst] = useState(false);
  const ordered = [...rows].sort((a, b) => (newestFirst ? b.publishedAt.localeCompare(a.publishedAt) : a.publishedAt.localeCompare(b.publishedAt)));
  const firstId = [...rows].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))[0]?.id;
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-dim">报道经过 · {rows.length}</h2>
        <div className="inline-flex rounded-full border border-line p-0.5 text-xs">
          {[false, true].map((v) => (
            <button key={String(v)} onClick={() => setNewestFirst(v)} className={cn("h-6 rounded-full px-2.5", newestFirst === v ? "bg-raised text-fg" : "text-dim hover:text-fg")}>
              {v ? "最新" : "最早"}
            </button>
          ))}
        </div>
      </div>
      <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[5px] before:w-px before:bg-line">
        {ordered.map((r) => (
          <li key={r.id} className="relative pl-7">
            <span className={cn("absolute top-[22px] left-0 size-[11px] rounded-full border-2 border-bg", r.tier === "T1" ? "bg-fg" : "bg-faint")} />
            <a href={r.url} target="_blank" rel="noreferrer" className="group block rounded-2xl p-3 transition-colors hover:bg-surface">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-faint">
                <span className="text-dim">{r.sourceName}</span>
                <span>{r.tier === "T1" ? "一手" : "媒体"}</span>
                <span>· {r.stamp}</span>
                {r.id === firstId && <span className="rounded-full border border-line px-1.5 text-[10px] text-dim">首发</span>}
                <span className={cn("ml-auto font-mono tabular-nums", r.selected && "text-fg")}>{r.score}</span>
              </div>
              <h3 className="mt-1.5 flex items-start gap-1 text-[15px] leading-snug font-medium">
                {r.title}
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
              </h3>
              {r.originalTitle !== r.title && <p className="mt-0.5 text-xs text-faint">{r.originalTitle}</p>}
              <p className="mt-1 text-sm leading-6 text-dim">{r.summary}</p>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
