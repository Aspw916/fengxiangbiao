"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { ClipButton } from "@/components/story/clip-button";
import { cn } from "@/lib/utils";
import type { SkyEvent } from "@/lib/sky";

export type Slide =
  | { kind: "event"; e: SkyEvent }
  | { kind: "cover"; eyebrow: string; title: string; lines: string[] };

function hoursLabel(ms: number) {
  const h = ms / 3600_000;
  if (h < 1) return `+${Math.max(1, Math.round(h * 60))} 分钟`;
  return `+${h < 10 ? h.toFixed(1) : Math.round(h)} 小时`;
}

function clockOf(t: number) {
  return new Date(t + 8 * 3600_000).toISOString().slice(11, 16);
}

/** 点火时间线：一个事件从首发到最近一篇报道，每个来源何时加入。 */
function Ignition({ e }: { e: SkyEvent }) {
  const start = e.reports[0]?.t ?? e.first;
  const end = Math.max(start + 3600_000, e.reports[e.reports.length - 1]?.t ?? start);
  return (
    <div className="mt-10">
      <div className="mb-3 flex items-baseline justify-between text-xs text-faint">
        <span>点火时间线 · {e.reports.length} 篇报道 · {e.sourceCount} 个来源</span>
        <span className="font-mono">{clockOf(start)} → {clockOf(end)}</span>
      </div>
      <div className="relative h-10" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        {e.reports.map((r, i) => (
          <span
            key={`${r.source}-${r.t}`}
            className={cn("ignite absolute top-1/2 rounded-full", r.tier === "T1" ? "size-3 bg-fg shadow-[0_0_16px_2px_rgba(255,255,255,0.35)]" : "size-2.5 border border-dim bg-bg")}
            style={{ left: `${((r.t - start) / (end - start)) * 100}%`, animationDelay: `${120 + i * 110}ms` }}
          />
        ))}
      </div>
      <ol className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        {e.reports.map((r, i) => (
          <li key={`${r.source}-${r.t}`} className="ignite-row min-w-0" style={{ animationDelay: `${160 + i * 110}ms` }}>
            <a href={r.url} target="_blank" rel="noreferrer" className="group -mx-2 flex items-baseline gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
              <span className="w-16 shrink-0 font-mono text-[11px] text-faint">{i === 0 ? "首发" : hoursLabel(r.t - start)}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("text-xs", r.tier === "T1" ? "text-fg" : "text-dim")}>{r.source}</span>
                <span className="block truncate text-sm text-dim group-hover:text-fg">{r.title}</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-faint opacity-0 group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

const STATUS_TEXT: Record<SkyEvent["status"], string> = { new: "刚出现", rising: "正在升温", cooling: "正在降温", steady: "" };

function EventSlide({ e }: { e: SkyEvent }) {
  return (
    <article>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-faint">
        <span>{e.categoryLabel}</span>
        <span>评分 {e.score}</span>
        {STATUS_TEXT[e.status] && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-dim">{STATUS_TEXT[e.status]}</span>}
        {!e.selected && <span className="text-xs">未入选</span>}
      </p>
      <h2 className="mt-4 text-[34px] leading-[1.15] font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.08]">{e.title}</h2>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-dim">{e.digest}</p>
      {e.reason && <p className="mt-4 max-w-2xl text-[15px] leading-7 text-dim"><span className="text-fg">为什么重要 · </span>{e.reason}</p>}
      <Ignition e={e} />
    </article>
  );
}

function CoverSlide({ s }: { s: Extract<Slide, { kind: "cover" }> }) {
  return (
    <div className="flex min-h-[50vh] flex-col justify-center">
      <p className="text-sm text-faint">{s.eyebrow}</p>
      <h2 className="mt-4 text-6xl font-semibold tracking-tight sm:text-8xl">{s.title}</h2>
      <div className="mt-8 space-y-2 text-lg text-dim">
        {s.lines.map((l) => <p key={l}>{l}</p>)}
      </div>
      <p className="mt-12 flex items-center gap-2 text-sm text-faint">按 → 或向左滑动开始 <ArrowRight className="size-4" /></p>
    </div>
  );
}

export function FocusReel({
  slides,
  initial = 0,
  onClose,
  closeHref,
  onChange,
  top,
  label = "聚焦",
}: {
  slides: Slide[];
  initial?: number;
  onClose?: () => void;
  closeHref?: string;
  onChange?: (index: number) => void;
  top?: React.ReactNode;
  label?: string;
}) {
  const [index, setIndex] = useState(Math.min(initial, slides.length - 1));
  const [dir, setDir] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  const go = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(slides.length - 1, index + delta));
      if (next === index) return;
      setDir(delta);
      setIndex(next);
      onChange?.(next);
      scroller.current?.scrollTo({ top: 0 });
    },
    [index, slides.length, onChange],
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || ev.metaKey || ev.ctrlKey) return;
      if (ev.key === "ArrowRight" || ev.key === "j") go(1);
      else if (ev.key === "ArrowLeft" || ev.key === "k") go(-1);
      else if (ev.key === "Escape" && onClose) onClose();
      else return;
      ev.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const slide = slides[index];
  const prev = slides[index - 1];
  const next = slides[index + 1];
  const titleOf = (s?: Slide) => (s ? (s.kind === "event" ? s.e.title : s.title) : "");

  const close = closeHref ? (
    <Link href={closeHref} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-dim hover:bg-raised hover:text-fg">
      <X className="size-4" /> 星场
    </Link>
  ) : (
    <button onClick={onClose} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-dim hover:bg-raised hover:text-fg">
      <X className="size-4" /> 星场 <kbd className="ml-1 hidden font-mono text-[10px] text-faint sm:inline">Esc</kbd>
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      ref={root}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-bg outline-none"
      onTouchStart={(ev) => (touch.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY })}
      onTouchEnd={(ev) => {
        if (!touch.current) return;
        const dx = ev.changedTouches[0].clientX - touch.current.x;
        const dy = ev.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex gap-1 px-4 pt-3 sm:px-8" aria-hidden>
        {slides.map((_, i) => (
          <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
            <span className={cn("block h-full bg-fg transition-all duration-500", i <= index ? "w-full" : "w-0")} />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2 sm:px-6">
        {close}
        <div className="flex items-center gap-2">
          {top}
          <span className="font-mono text-xs text-faint tabular-nums" aria-live="polite" data-counter>
            {index + 1} / {slides.length}
          </span>
          {slide.kind === "event" && <ClipButton clip={{ eventId: slide.e.id, title: slide.e.title, summary: slide.e.digest }} />}
        </div>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div key={index} className={cn("mx-auto max-w-4xl px-6 pt-8 pb-16 sm:px-10 sm:pt-16", dir > 0 ? "slide-in-right" : "slide-in-left")}>
          {slide.kind === "event" ? <EventSlide e={slide.e} /> : <CoverSlide s={slide} />}
        </div>
      </div>

      <nav className="grid grid-cols-2 gap-2 border-t border-line px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6" aria-label="翻页">
        <button
          onClick={() => go(-1)}
          disabled={!prev}
          className="group flex min-h-11 items-center gap-2 rounded-2xl px-3 text-left text-sm text-dim hover:bg-surface hover:text-fg disabled:opacity-30"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span className="line-clamp-1">{prev ? titleOf(prev) : "已是第一件"}</span>
        </button>
        <button
          onClick={() => go(1)}
          disabled={!next}
          className="group flex min-h-11 items-center justify-end gap-2 rounded-2xl px-3 text-right text-sm text-dim hover:bg-surface hover:text-fg disabled:opacity-30"
        >
          <span className="line-clamp-1">{next ? titleOf(next) : "看完了"}</span>
          <ArrowRight className="size-4 shrink-0" />
        </button>
      </nav>
    </div>
  );
}
