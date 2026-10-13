"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Minus, Pause, Play, Plus, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { axisTime, axisU, BANDS, heatAt, matches, RANGE_H, type SkyEvent } from "@/lib/sky";
import { FocusReel } from "./focus-reel";
import { RefreshControl } from "./refresh-control";

const PLAY_MS = 9000;
const CLOCK_MS = 15_000;
const SCRUB_STEPS = 1000;
const MAX_ZOOM = 4;
const ZOOM_HINT = "⌘/Ctrl + 滚轮、触控板或双指捏合缩放星空；双击复位";

function hm(t: number) {
  return new Date(t + 8 * 3600_000).toISOString().slice(11, 16);
}

function hash01(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function stamp(t: number) {
  const d = new Date(t + 8 * 3600_000);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${d.toISOString().slice(11, 16)}`;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

type Command = { cmd: string; hint: string; run: () => void };

export function Sky({
  events,
  now: renderedAt,
  generatedAt,
  mode,
  initialFocus,
}: {
  events: SkyEvent[];
  now: number;
  generatedAt: string;
  mode: "demo" | "live";
  initialFocus?: string;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const reduced = useReducedMotion();
  const [fieldRef, size] = useSize<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement>(null);

  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(id);
  }, []);
  const start = now - RANGE_H * 3600_000;
  // null 表示跟随实时时间；拖动或回放时固定到某个时刻。
  const [pinned, setPinned] = useState<number | null>(null);
  const t = pinned ?? now;
  const setT = setPinned;
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [officialOnly, setOfficialOnly] = useState(false);
  const [showDust, setShowDust] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(initialFocus ?? null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const pointerType = useRef("mouse");
  const [armed, setArmed] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const portrait = size.h > size.w * 1.1;
  const compact = size.w < 720;
  const pad = portrait ? { l: 36, r: 28, t: 132, b: 200 } : { l: compact ? 64 : 104, r: compact ? 40 : 150, t: 132, b: 176 };
  const areaW = Math.max(0, size.w - pad.l - pad.r);
  const areaH = Math.max(0, size.h - pad.t - pad.b);
  const scale = compact ? 0.62 : 1;
  const inRange = useMemo(() => events.filter((e) => e.first >= start - 6 * 3600_000), [events, start]);

  const bodies = useMemo(() => {
    return inRange.map((e) => {
      const u = axisU(e.first, now);
      const v = (e.band + 0.5 + (hash01(e.id) - 0.5) * 0.7) / BANDS.length;
      const [nx, ny] = portrait ? [v, u] : [u, v];
      const x = pad.l + nx * areaW;
      const y = pad.t + ny * areaH;
      const heat = e.first <= t ? heatAt(e, t) : 0;
      const official = e.reports.some((r) => r.tier === "T1");
      return { e, x, y, heat, lit: e.first <= t, official };
    });
  }, [inRange, now, portrait, t, pad.l, pad.t, areaW, areaH]);

  const isVisible = useCallback(
    (b: (typeof bodies)[number]) => b.lit && (b.e.selected || showDust) && (!officialOnly || b.official),
    [showDust, officialOnly],
  );

  const q = query.startsWith("/") ? "" : query;
  const ranked = useMemo(
    () => bodies.filter((b) => isVisible(b) && b.e.selected && matches(b.e, q)).sort((a, b) => b.heat - a.heat || b.e.score - a.e.score),
    [bodies, isVisible, q],
  );
  const focusOrder = ranked.length ? ranked.map((b) => b.e) : events.filter((e) => e.selected);
  const maxHeat = Math.max(1, ...bodies.map((b) => b.heat));
  const diameter = (heat: number) => (8 + Math.sqrt(heat / maxHeat) * 46) * scale;

  const labels = useMemo(() => {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const out: { id: string; x: number; y: number; w: number; left: boolean; title: string }[] = [];
    const limit = compact ? (q ? 4 : 3) : q ? 8 : 6;
    for (const b of ranked) {
      if (out.length >= limit) break;
      const d = diameter(b.heat);
      const w = Math.min(compact ? 150 : 224, b.e.title.length * 12 + 8);
      const left = b.x + d / 2 + 10 + w > size.w - 12;
      const x = left ? b.x - d / 2 - 10 - w : b.x + d / 2 + 10;
      const box = { x, y: b.y - 10, w, h: 20 };
      if (placed.some((o) => box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y)) continue;
      placed.push(box);
      out.push({ id: b.e.id, x, y: b.y, w, left, title: b.e.title });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, compact, q, size.w, maxHeat, scale]);

  const openFocus = useCallback((id: string) => {
    setFocusId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("focus", id);
    window.history.replaceState(null, "", url);
  }, []);
  const closeFocus = useCallback(() => {
    setFocusId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    window.history.replaceState(null, "", url);
  }, []);

  const [playEnd, setPlayEnd] = useState(0);
  const play = useCallback(() => {
    if (reduced) {
      setT(null);
      return;
    }
    setPlayEnd(now);
    setPlaying(true);
    setT(start);
  }, [reduced, now, start, setT]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const begin = performance.now();
        const tick = (ts: number) => {
      const p = Math.min(1, (ts - begin) / PLAY_MS);
      if (p < 1) {
        setT(axisTime(p, playEnd));
        raf = requestAnimationFrame(tick);
      } else {
        setT(null);
        setPlaying(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, playEnd, setT]);

  const commands: Command[] = [
    { cmd: "/回放", hint: "重演最近 72 小时", run: play },
    { cmd: "/现在", hint: "回到当前时间", run: () => (setPlaying(false), setT(null)) },
    { cmd: "/日报", hint: "放映今天的日报", run: () => router.push("/edition") },
    { cmd: "/一手", hint: officialOnly ? "显示全部来源" : "只看有一手信源的事件", run: () => setOfficialOnly((v) => !v) },
    { cmd: "/尘埃", hint: showDust ? "隐藏未入选的资料" : "显示未入选的资料", run: () => setShowDust((v) => !v) },
    { cmd: "/列表", hint: "切换到文字列表视图", run: () => router.push("/signals") },
    { cmd: "/收藏", hint: "打开收藏", run: () => router.push("/clips") },
    { cmd: "/方法", hint: "它是怎么工作的", run: () => router.push("/method") },
    { cmd: resolvedTheme === "dark" ? "/浅色" : "/深色", hint: "切换外观", run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") },
  ];
  const cmdMatches = query.startsWith("/") ? commands.filter((c) => c.cmd.startsWith(query.trim()) || query.trim() === "/") : [];
  const results = query.startsWith("/") ? [] : query ? ranked.slice(0, 5) : [];
  const options = query.startsWith("/") ? cmdMatches.length : results.length;

  const submit = () => {
    if (query.startsWith("/")) {
      const c = cmdMatches[Math.min(cursor, cmdMatches.length - 1)];
      if (c) {
        c.run();
        setQuery("");
      }
      return;
    }
    const target = results[cursor]?.e ?? ranked[0]?.e;
    if (target) openFocus(target.id);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement).tagName;
      if (focusId || tag === "INPUT" || tag === "TEXTAREA" || ev.metaKey || ev.ctrlKey) return;
      if (ev.key === "/") {
        ev.preventDefault();
        inputRef.current?.focus();
        setQuery("/");
      } else if (ev.key === " ") {
        ev.preventDefault();
        if (playing) setPlaying(false);
        else play();
      } else if (ev.key === "Enter" && ranked[0]) {
        openFocus(ranked[0].e.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId, playing, play, ranked, openFocus]);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((v) => {
      const k = Math.max(1, Math.min(MAX_ZOOM, v.k * factor));
      if (k === 1) return { x: 0, y: 0, k };
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
    });
  }, []);
  const zoomCenter = (factor: number) => zoomAt(factor, size.w / 2, size.h / 2);

  const zoomed = useRef(false);
  useEffect(() => {
    zoomed.current = view.k > 1;
  }, [view.k]);

  // 只拦截带修饰键的滚轮（含触控板捏合）和 Safari 手势，避免和浏览器整页缩放叠加；普通滚轮只在放大后用于平移。
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    let gesture = 0;
    const local = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      return [x - r.left, y - r.top] as const;
    };
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault();
        if (gesture) return;
        const [px, py] = local(ev.clientX, ev.clientY);
        zoomAt(Math.exp(-Math.max(-50, Math.min(50, ev.deltaY)) * 0.004), px, py);
      } else if (zoomed.current) {
        ev.preventDefault();
        setView((v) => ({ ...v, x: v.x - ev.deltaX, y: v.y - ev.deltaY }));
      }
    };
    type GestureEvent = Event & { scale: number; clientX: number; clientY: number };
    const onGestureStart = (ev: Event) => {
      ev.preventDefault();
      gesture = 1;
    };
    const onGestureChange = (ev: Event) => {
      ev.preventDefault();
      const g = ev as GestureEvent;
      const [px, py] = local(g.clientX, g.clientY);
      zoomAt(g.scale / gesture, px, py);
      gesture = g.scale;
    };
    const onGestureEnd = (ev: Event) => {
      ev.preventDefault();
      gesture = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("gestureend", onGestureEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("gestureend", onGestureEnd);
    };
  }, [fieldRef, zoomAt]);

  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const pinchState = () => {
    const [a, b] = [...touches.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };

  const focusSlides = focusOrder.map((e) => ({ kind: "event" as const, e }));
  const focusIndex = focusId ? Math.max(0, focusOrder.findIndex((e) => e.id === focusId)) : 0;
  const hoveredBody = bodies.find((b) => b.e.id === hovered);
  const hoursAgo = Math.round((now - t) / 3600_000);
  const ticks = compact ? [72, 24, 6, 0] : [72, 48, 24, 12, 6, 0];

  return (
    <>
      <div className="fixed inset-x-0 top-14 bottom-0 overflow-hidden bg-bg select-none">
        <div className="pointer-events-none absolute top-5 left-5 z-10 max-w-[calc(100%-9.5rem)] sm:top-7 sm:left-8">
          <p className="flex items-center gap-1.5 text-xs text-faint">
            {pinned === null ? (
              <>
                <span className="size-1.5 rounded-full bg-fg/70" aria-hidden />
                实时 · 北京时间
              </>
            ) : hoursAgo === 0 ? (
              "不到 1 小时前"
            ) : (
              `${hoursAgo} 小时前`
            )}
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums sm:text-2xl">{stamp(t)}</p>
          <p className="mt-1 text-xs text-dim">
            {ranked.length} 件事在发光{q && ` · 匹配“${q}”`}
            {officialOnly && " · 仅一手"}
          </p>
          <RefreshControl generatedAt={generatedAt} mode={mode} now={now} />
        </div>

        <div className="absolute top-5 right-4 z-10 flex items-center rounded-full border border-line bg-surface/80 backdrop-blur sm:top-7 sm:right-8" title={ZOOM_HINT}>
          <button type="button" onClick={() => zoomCenter(1 / 1.25)} disabled={view.k <= 1} className="flex size-8 items-center justify-center text-dim hover:text-fg disabled:opacity-40" aria-label="缩小星空">
            <Minus className="size-3.5" />
          </button>
          <button type="button" onClick={() => setView({ x: 0, y: 0, k: 1 })} className="w-11 font-mono text-[11px] text-dim tabular-nums hover:text-fg" aria-label="星空缩放复位">
            {Math.round(view.k * 100)}%
          </button>
          <button type="button" onClick={() => zoomCenter(1.25)} disabled={view.k >= MAX_ZOOM} className="flex size-8 items-center justify-center text-dim hover:text-fg disabled:opacity-40" aria-label="放大星空">
            <Plus className="size-3.5" />
          </button>
        </div>

        <div
          ref={fieldRef}
          className={cn("absolute inset-0 touch-none", view.k > 1 ? "cursor-grab" : "cursor-default")}
          onDoubleClick={() => setView({ x: 0, y: 0, k: 1 })}
          onPointerDown={(ev) => {
            if (ev.pointerType === "touch") {
              const rect = ev.currentTarget.getBoundingClientRect();
              touches.current.set(ev.pointerId, { x: ev.clientX - rect.left, y: ev.clientY - rect.top });
              if (touches.current.size === 2) {
                pinch.current = pinchState();
                if (drag.current) drag.current.moved = true;
                return;
              }
            }
            drag.current = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y, moved: false };
          }}
          onPointerMove={(ev) => {
            if (ev.pointerType === "touch" && touches.current.has(ev.pointerId)) {
              const rect = ev.currentTarget.getBoundingClientRect();
              touches.current.set(ev.pointerId, { x: ev.clientX - rect.left, y: ev.clientY - rect.top });
              const p = pinch.current;
              if (p && touches.current.size === 2) {
                const next = pinchState();
                setView((v) => ({ ...v, x: v.x + next.mx - p.mx, y: v.y + next.my - p.my }));
                zoomAt(next.dist / Math.max(1, p.dist), next.mx, next.my);
                pinch.current = next;
                return;
              }
            }
            const d = drag.current;
            if (!d || pinch.current) return;
            const dx = ev.clientX - d.x;
            const dy = ev.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < 5) return;
            d.moved = true;
            setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
          }}
          onPointerUp={(ev) => {
            touches.current.delete(ev.pointerId);
            if (touches.current.size < 2) pinch.current = null;
            setTimeout(() => (drag.current = null), 0);
          }}
          onPointerCancel={(ev) => {
            touches.current.delete(ev.pointerId);
            pinch.current = null;
            drag.current = null;
          }}
          onPointerLeave={(ev) => {
            if (ev.pointerType !== "touch") drag.current = null;
          }}
          aria-label="事件星场"
          role="group"
        >
          <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            {size.w > 0 &&
              ticks.map((h) => {
                const u = axisU(now - h * 3600_000, now);
                const pos = portrait ? pad.t + u * areaH : pad.l + u * areaW;
                return (
                  <div key={h} aria-hidden className={cn("absolute bg-line/60", portrait ? "h-px" : "w-px")} style={portrait ? { top: pos, left: pad.l - 12, right: pad.r - 12 } : { left: pos, top: pad.t - 24, bottom: pad.b - 24 }}>
                    <span className={cn("absolute font-mono text-[10px] whitespace-nowrap text-faint", portrait ? "right-0 -translate-y-full pb-1" : "bottom-0 left-2")}>
                      {h === 0 ? hm(now) : `-${h}h`}
                    </span>
                  </div>
                );
              })}
            {size.w > 0 &&
              BANDS.map((b, i) => {
                const v = (i + 0.5) / BANDS.length;
                const pos = portrait ? pad.l + v * areaW : pad.t + v * areaH;
                return (
                  <span
                    key={b.key}
                    aria-hidden
                    className={cn("absolute text-[11px] tracking-widest text-faint/70", portrait ? "-translate-x-1/2" : "left-4 -translate-y-1/2 sm:left-8")}
                    style={portrait ? { left: pos, top: pad.t - 40 } : { top: pos }}
                  >
                    {b.label}
                  </span>
                );
              })}

            {size.w > 0 &&
              [...bodies]
                .sort((a, b) => a.heat - b.heat)
                .map((b) => {
                  const visible = isVisible(b);
                  const match = !q || matches(b.e, q);
                  const star = b.e.selected;
                  const d = star ? diameter(b.heat) : 3;
                  const glow = star ? Math.round(6 + (b.e.score / 100) * 26 * (0.4 + b.heat / maxHeat)) : 0;
                  const opacity = !visible ? 0 : !match ? 0.08 : star ? 0.35 + (b.e.score / 100) * 0.65 : 0.25;
                  const fresh = star && t - b.e.first < 6 * 3600_000 && t >= b.e.first;
                  return (
                    <button
                      key={b.e.id}
                      type="button"
                      tabIndex={visible && star ? 0 : -1}
                      aria-hidden={!visible || !star}
                      aria-label={`${b.e.title}，${b.e.categoryLabel}，${b.e.sourceCount} 个来源，评分 ${b.e.score}`}
                      onMouseEnter={() => setHovered(b.e.id)}
                      onMouseLeave={() => setHovered((h) => (h === b.e.id ? null : h))}
                      onFocus={() => setHovered(b.e.id)}
                      onBlur={() => setHovered((h) => (h === b.e.id ? null : h))}
                      onPointerDown={(ev) => (pointerType.current = ev.pointerType)}
                      onClick={() => {
                        if (drag.current?.moved || !star) return;
                        if (pointerType.current === "touch" && armed !== b.e.id) {
                          setArmed(b.e.id);
                          setHovered(b.e.id);
                          return;
                        }
                        openFocus(b.e.id);
                      }}
                      className={cn(
                        "star absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-4 focus-visible:ring-offset-bg",
                        star ? "bg-fg" : "pointer-events-none bg-dim",
                        fresh && !reduced && "star-pulse",
                        !visible && "pointer-events-none",
                      )}
                      style={{ left: b.x, top: b.y, width: d, height: d, opacity, boxShadow: glow ? `0 0 ${glow}px ${glow / 3}px color-mix(in oklab, var(--fg) 30%, transparent)` : undefined }}
                    />
                  );
                })}

            {size.w > 0 &&
              labels
                .filter((l) => l.id !== hovered)
                .map((l) => (
                  <span
                    key={`l-${l.id}`}
                    aria-hidden
                    className={cn("pointer-events-none absolute -translate-y-1/2 truncate text-xs text-dim", l.left && "text-right")}
                    style={{ left: l.x, top: l.y, width: l.w }}
                  >
                    {l.title}
                  </span>
                ))}
          </div>

          {hoveredBody && isVisible(hoveredBody) && hoveredBody.e.selected && (
            <div
              className="pointer-events-none absolute z-20 w-64 rounded-2xl border border-line bg-surface/95 p-3 shadow-2xl backdrop-blur"
              style={{
                left: Math.min(size.w - 272, Math.max(8, hoveredBody.x * view.k + view.x + 18)),
                top: Math.min(size.h - 200, Math.max(8, hoveredBody.y * view.k + view.y - 20)),
              }}
            >
              <p className="text-[11px] text-faint">
                {hoveredBody.e.categoryLabel} · {hoveredBody.e.sourceCount} 个来源 · 评分 {hoveredBody.e.score}
              </p>
              <p className="mt-1 text-sm leading-snug font-medium">{hoveredBody.e.title}</p>
              <p className="mt-2 text-[11px] text-faint">共振 {hoveredBody.heat.toFixed(1)} · 点击聚焦（触屏再点一次）</p>
            </div>
          )}
        </div>

        {inRange.filter((e) => e.selected).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-base font-medium">最近 {RANGE_H} 小时的天空还是暗的</p>
              <p className="mt-2 text-sm text-dim">还没有事件入选。运行一次流水线，或去列表视图看看全部资料。</p>
              <Link href="/signals" className="mt-4 inline-block text-sm underline underline-offset-4">打开列表视图</Link>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => (playing ? setPlaying(false) : play())}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-dim hover:border-faint hover:text-fg"
                aria-label={playing ? "暂停回放" : "回放最近 72 小时"}
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <input
                type="range"
                className="scrubber min-w-0 flex-1"
                min={0}
                max={SCRUB_STEPS}
                step={1}
                value={Math.round(axisU(t, now) * SCRUB_STEPS)}
                onChange={(ev) => {
                  setPlaying(false);
                  const v = Number(ev.target.value);
                  setT(v >= SCRUB_STEPS ? null : axisTime(v / SCRUB_STEPS, now));
                }}
                aria-label="时间"
                aria-valuetext={stamp(t)}
              />
              <button
                onClick={() => (setPlaying(false), setT(null), setView({ x: 0, y: 0, k: 1 }))}
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-dim hover:text-fg", pinned === null && view.k === 1 && "invisible")}
                aria-label="回到当前时间"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>

            <div className="relative">
              {(options > 0 || (query && !query.startsWith("/"))) && (
                <ul className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-2xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur" role="listbox">
                  {query.startsWith("/")
                    ? cmdMatches.map((c, i) => (
                        <li key={c.cmd} role="option" aria-selected={i === cursor}>
                          <button
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => (c.run(), setQuery(""))}
                            className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm", i === cursor ? "bg-raised" : "hover:bg-raised")}
                          >
                            <span className="font-mono">{c.cmd}</span>
                            <span className="text-xs text-faint">{c.hint}</span>
                          </button>
                        </li>
                      ))
                    : results.length
                      ? results.map((b, i) => (
                          <li key={b.e.id} role="option" aria-selected={i === cursor}>
                            <button
                              onMouseDown={(ev) => ev.preventDefault()}
                              onClick={() => openFocus(b.e.id)}
                              onMouseEnter={() => setHovered(b.e.id)}
                              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm", i === cursor ? "bg-raised" : "hover:bg-raised")}
                            >
                              <span className="size-2 shrink-0 rounded-full bg-fg" style={{ opacity: 0.3 + (b.heat / maxHeat) * 0.7 }} />
                              <span className="line-clamp-1 flex-1">{b.e.title}</span>
                              <span className="shrink-0 text-xs text-faint">{b.e.sourceCount} 源</span>
                            </button>
                          </li>
                        ))
                      : <li className="px-3 py-2 text-sm text-dim">此刻没有与“{query}”相关的事件。拖动时间轴或换个词试试。</li>}
                </ul>
              )}
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  submit();
                }}
                className="flex h-13 items-center gap-3 rounded-full border border-line bg-surface pr-2 pl-5 transition-colors focus-within:border-faint"
              >
                <Sparkles className="size-4 shrink-0 text-faint" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(ev) => {
                    setQuery(ev.target.value);
                    setCursor(0);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "ArrowDown") {
                      ev.preventDefault();
                      setCursor((c) => Math.min(Math.max(0, options - 1), c + 1));
                    } else if (ev.key === "ArrowUp") {
                      ev.preventDefault();
                      setCursor((c) => Math.max(0, c - 1));
                    } else if (ev.key === "Escape") {
                      setQuery("");
                      inputRef.current?.blur();
                    }
                  }}
                  placeholder="搜事件，或输入 / 看指令"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
                  aria-label="指令栏"
                  enterKeyHint="go"
                />
                <button type="submit" className="flex h-9 shrink-0 items-center rounded-full bg-fg px-4 text-sm font-medium text-bg hover:opacity-90" disabled={!ranked.length && !query.startsWith("/")}>
                  聚焦
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>

        {focusId && focusSlides.length > 0 && (
          <FocusReel
            slides={focusSlides}
            initial={focusIndex}
            onClose={closeFocus}
            onChange={(i) => {
              const id = focusOrder[i]?.id;
              if (!id) return;
              const url = new URL(window.location.href);
              url.searchParams.set("focus", id);
              window.history.replaceState(null, "", url);
            }}
          />
        )}
    </>
  );
}
