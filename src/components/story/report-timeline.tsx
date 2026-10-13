"use client";

import { useState } from "react";
import { ArrowDownUp, ExternalLink } from "lucide-react";
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
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b-2 border-ink pb-1.5">
        <h2 className="font-serif text-lg font-bold tracking-wider">报道经过</h2>
        <button onClick={() => setNewestFirst((v) => !v)} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
          <ArrowDownUp className="size-3.5" />
          {newestFirst ? "最新在前" : "最早在前"}
        </button>
      </div>
      <ol className="relative ml-2 border-l border-rule">
        {ordered.map((r, i) => (
          <li key={r.id} className="relative pb-6 pl-6 last:pb-0">
            <span
              className={cn(
                "absolute top-1.5 -left-[5px] size-[9px] rounded-full border",
                r.tier === "T1" ? "border-verdigris bg-verdigris" : "border-ink bg-paper",
              )}
            />
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
              <span className="font-mono">{r.stamp}</span>
              <span className={cn(r.tier === "T1" && "text-verdigris")}>{r.sourceName}</span>
              <span>{r.tier === "T1" ? "一手" : "媒体"}</span>
              {((!newestFirst && i === 0) || (newestFirst && i === ordered.length - 1)) && <span className="text-vermilion">首发</span>}
              <span className="ml-auto font-mono">
                <span className={cn(r.selected && "text-vermilion")}>{r.score}</span> 分
              </span>
            </div>
            <h3 className="mt-1 font-serif font-bold leading-snug">{r.title}</h3>
            {r.originalTitle !== r.title && <p className="mt-0.5 text-xs text-ink-soft italic">{r.originalTitle}</p>}
            <p className="mt-1 text-sm leading-6 text-ink-soft">{r.summary}</p>
            <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs hover:text-vermilion">
              阅读原文 <ExternalLink className="size-3" />
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
