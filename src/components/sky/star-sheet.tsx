"use client";

import { X } from "lucide-react";
import type { SkyEvent } from "@/lib/sky";
import { ScoreBadge } from "@/components/score-badge";

/** 触屏上点星星弹出的底部卡片：先看摘要，再决定是否展开。 */
export function StarSheet({ e, why, onOpen, onClose }: { e: SkyEvent; heat?: number; why?: string | null; onOpen: () => void; onClose: () => void }) {
  return (
    <div className="sheet-up fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="dialog" aria-label={e.title}>
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="pt-1 text-[11px] text-faint">
            {e.categoryLabel} · {e.sourceCount} 个来源 · <ScoreBadge score={e.score} official={e.reports.some((r) => r.tier === "T1")} selected={e.selected} />
          </div>
          <button type="button" onClick={onClose} className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-dim hover:text-fg" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-base leading-snug font-medium">{e.title}</p>
        {e.digest && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-dim">{e.digest}</p>}
        {why && <p className="mt-2 text-[13px] leading-relaxed text-dim">{why}</p>}
        <button type="button" onClick={onOpen} className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-fg text-sm font-medium text-bg hover:opacity-90">
          展开阅读
        </button>
      </div>
    </div>
  );
}
