"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Minus, Pause, Play, Plus, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/score-badge";
import { axisTime, axisU, BANDS, heatAt, matches, RANGE_H, type SkyEvent } from "@/lib/sky";
import { fullestLens, LENSES, lensByKey, lensMatches, lensWhy, mentions, sentenceWords, type LensKey } from "@/lib/lenses";
import { FocusReel } from "./focus-reel";
import { RefreshControl } from "./refresh-control";
import { SentenceSky } from "./sentence";
import { stageSkyIds, useLastSky } from "./use-last-visit";
import { DensityTrack } from "./density-track";
import { Minimap } from "./minimap";
import { fanAround, separateStars } from "./separate";
import { StarSheet } from "./star-sheet";

const PLAY_MS = 9000;
const CLOCK_MS = 15_000;
const SCRUB_STEPS = 1000;
const ENTER_MS = 900;
const LINK_SHARED_MAX = 3;
const LINK_TOPIC_MAX = 2;
const MINIMAP_AT = 1.5;
const MAX_ZOOM = 4;
const ZOOM_HINT = "⌘/Ctrl + 滚轮、触控板或双指捏合缩放星空；双击复位。键盘：← → 按时间、↑ ↓ 按热度，回车打开，1–4 换透镜，[ ] 拖动那时和现在";

function hm(t: number) {
  return new Date(t + 8 * 3600_000).toISOString().slice(11, 16);
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

  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setEntering(false), ENTER_MS + 900);
    return () => clearTimeout(id);
  }, []);

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
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armHover = (id: string | null) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (id) setHovered(id);
    else hoverTimer.current = setTimeout(() => (setHovered(null), setOpenCluster(null)), 180);
  };
  const [sheet, setSheet] = useState<string | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [fallFrom, setFallFrom] = useState({ x: 0, y: 140 });
  const lastSky = useLastSky();
  const [sentence, setSentence] = useState<"cover" | "open" | "off">(initialFocus ? "off" : "cover");
  const [word, setWord] = useState<string | null>(null);
  const [lens, setLens] = useState<LensKey>(() => fullestLens(events));
  const [cut, setCut] = useState(0.5);

  const coarse = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  const portrait = size.h > size.w * 1.1;
  const compact = size.w < 720;
  const pad = portrait ? { l: 36, r: 28, t: 168, b: 200 } : { l: compact ? 64 : 104, r: compact ? 40 : 150, t: 172, b: 176 };
  const areaW = Math.max(0, size.w - pad.l - pad.r);
  const areaH = Math.max(0, size.h - pad.t - pad.b);
  const scale = compact ? 0.62 : 1;
  const inRange = useMemo(() => events.filter((e) => e.first >= start - 6 * 3600_000), [events, start]);
  const lensOn = sentence === "off";
  const lead = useMemo(() => {
    const pool = inRange.filter((e) => e.selected && e.first >= start);
    return [...pool].sort((a, b) => {
      const weight = (e: SkyEvent) => Math.max(heatAt(e, now), 0.2) * (1 + e.sourceCount) * e.score;
      return weight(b) - weight(a);
    })[0] ?? null;
  }, [inRange, start, now]);
  const sentenceMode = lead ? sentence : "off";

  const bodies = useMemo(() => {
    const bandCount = lensOn ? LENSES.length : BANDS.length;
    const lane = lensOn ? Math.max(0, LENSES.findIndex((item) => item.key === lens)) : null;
    const pitch = Math.max(1, (portrait ? areaW : areaH) / bandCount);
    const raw = inRange.map((e) => {
      const u = axisU(e.first, now);
      const v = ((lane ?? e.band) + 0.5) / bandCount;
      const [nx, ny] = portrait ? [v, u] : [u, v];
      const x = pad.l + nx * areaW;
      const y = pad.t + ny * areaH;
      const heat = e.first <= t ? heatAt(e, t) : 0;
      const official = e.reports.some((r) => r.tier === "T1");
      return { e, u, x, y, heat, lit: e.first <= t, official };
    });
    const maxHeat = Math.max(1, ...raw.map((b) => b.heat));
    const radius = (heat: number) => ((8 + Math.sqrt(heat / maxHeat) * 46) * scale) / 2;
    const placed = separateStars(
      raw
        .filter((b) => b.lit && b.e.selected && (!officialOnly || b.official) && (!lensOn || lensMatches(b.e, lens)))
        .map((b) => ({ id: b.e.id, x: b.x, y: b.y, r: radius(b.heat), band: lensOn ? (lane ?? 0) : b.e.band, priority: b.heat })),
      { timeAxis: portrait ? "y" : "x", pitch },
    );
    const byId = new Map(placed.map((p) => [p.id, p]));
    let laid = raw.map((b) => {
      const p = byId.get(b.e.id);
      if (!p) return { ...b, r: 1.5, clusterId: null as string | null, count: 1, role: "solo" as const };
      return { ...b, x: p.x, y: p.y, r: p.r, clusterId: p.clusterId, count: p.count, role: p.role };
    });
    if (openCluster) {
      const members = laid.filter((b) => b.clusterId === openCluster).sort((a, b) => a.e.first - b.e.first);
      const lead = members.find((m) => m.role === "lead");
      if (lead && members.length > 1) {
        const fanR = Math.max(lead.r, compact ? 16 : 13);
        const spots = new Map(fanAround(members.filter((m) => m.e.id !== lead.e.id).map((m) => ({ id: m.e.id })), lead.x, lead.y, fanR).map((s) => [s.id, s]));
        laid = laid.map((b) => {
          if (b.e.id === lead.e.id) return { ...b, r: fanR };
          const s = spots.get(b.e.id);
          if (!s) return b;
          return { ...b, x: Math.min(size.w - 24, Math.max(24, s.x)), y: Math.min(size.h - 24, Math.max(24, s.y)), r: fanR };
        });
      }
    }
    return laid;
  }, [inRange, now, portrait, t, pad.l, pad.t, areaW, areaH, scale, officialOnly, openCluster, compact, size.w, size.h, lensOn, lens]);

  const isThen = useCallback(
    (e: SkyEvent) => {
      if (!lastSky) return false;
      return lastSky.ids ? lastSky.ids.includes(e.id) : e.first <= lastSky.at;
    },
    [lastSky],
  );

  const isVisible = useCallback(
    (b: (typeof bodies)[number]) => {
      if (sentenceMode === "cover") return false;
      if (!b.lit || !(b.e.selected || showDust) || (officialOnly && !b.official)) return false;
      if (sentenceMode === "open" && word && !mentions(b.e, word)) return false;
      if (sentenceMode === "off" && !lensMatches(b.e, lens)) return false;
      if (sentenceMode === "off" && lastSky && cut < 0.98) {
        const onNowSide = axisU(b.e.first, now) >= cut;
        if (!onNowSide && !isThen(b.e)) return false;
      }
      return true;
    },
    [sentenceMode, showDust, officialOnly, word, lens, lastSky, cut, now, isThen],
  );

  const q = query.startsWith("/") ? "" : query;
  const ranked = useMemo(
    () => bodies.filter((b) => isVisible(b) && b.e.selected && matches(b.e, q)).sort((a, b) => b.heat - a.heat || b.e.score - a.e.score),
    [bodies, isVisible, q],
  );
  const focusOrder = ranked.length ? ranked.map((b) => b.e) : events.filter((e) => e.selected);

  const [initialIds] = useState(() => new Set(events.map((e) => e.id)));
  const fresh = useMemo(
    () =>
      events
        .filter((e) => e.selected && ((lastSky !== null && e.first > lastSky.at) || !initialIds.has(e.id)))
        .sort((a, b) => b.first - a.first),
    [events, lastSky, initialIds],
  );
  useEffect(() => {
    stageSkyIds(inRange.filter((e) => e.selected).map((e) => e.id));
  }, [inRange]);
  const freshIds = useMemo(() => new Set(fresh.map((e) => e.id)), [fresh]);
  const caption = playing ? inRange.reduce<SkyEvent | null>((acc, e) => (e.selected && e.first <= t && (!acc || e.first > acc.first) ? e : acc), null) : null;
  const maxHeat = Math.max(1, ...bodies.map((b) => b.heat));

  const labels = useMemo(() => {
    const hits = (box: { x: number; y: number; w: number; h: number }, o: { x: number; y: number; w: number; h: number }) =>
      box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    for (const b of bodies) {
      if (!b.lit || !b.e.selected || (b.role === "member" && b.clusterId !== openCluster)) continue;
      placed.push({ x: b.x - b.r - 8, y: b.y - b.r - 6, w: b.r * 2 + 16, h: b.r * 2 + 12 });
    }
    const out: { id: string; x: number; y: number; w: number; left: boolean; title: string }[] = [];
    const limit = compact ? (q ? 4 : 3) : q ? 8 : 6;
    for (const b of ranked) {
      if (out.length >= limit) break;
      if (b.count > 1) continue;
      const w = Math.min(compact ? 150 : 200, b.e.title.length * 12 + 8);
      const left = b.x + b.r + 10 + w > size.w - 12;
      const x = left ? b.x - b.r - 10 - w : b.x + b.r + 10;
      const box = { x, y: b.y - 10, w, h: 20 };
      if (placed.some((o) => hits(box, o))) continue;
      placed.push(box);
      out.push({ id: b.e.id, x, y: b.y, w, left, title: b.e.title });
    }
    return out;
  }, [ranked, bodies, compact, q, size.w, openCluster]);

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
    { cmd: "/一句", hint: "回到今天的那句话", run: () => (setSentence("cover"), setWord(null)) },
    { cmd: "/透镜", hint: "换到下一面决策透镜", run: () => setLens(LENSES[(LENSES.findIndex((item) => item.key === lens) + 1) % LENSES.length].key) },
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
      if (sentenceMode !== "off") {
        if (ev.key === "Escape") {
          ev.preventDefault();
          if (sentenceMode === "open") {
            setSentence("cover");
            setWord(null);
          } else setSentence("off");
          return;
        }
        if (sentenceMode === "cover") {
          const words = lead ? sentenceWords(lead.title) : [];
          if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && words.length) {
            ev.preventDefault();
            const at = Math.max(0, words.indexOf(word ?? words[0]));
            const step = ev.key === "ArrowRight" ? 1 : -1;
            const next = words[(at + step + words.length) % words.length];
            setWord(next);
            document.querySelector<HTMLElement>(`[data-sentence-word="${next}"]`)?.focus();
            return;
          }
          if (ev.key === "Enter" && tag !== "BUTTON") {
            ev.preventDefault();
            if (words.length) {
              setWord(word && words.includes(word) ? word : words[0]);
              setSentence("open");
            } else setSentence("off");
            return;
          }
          if (ev.key !== "/") return;
        }
      } else {
        if (ev.key === "[" || ev.key === "]") {
          if (!lastSky) return;
          ev.preventDefault();
          setCut((value) => Math.min(1, Math.max(0.08, value + (ev.key === "]" ? 0.06 : -0.06))));
          return;
        }
        if (/^[1-4]$/.test(ev.key)) {
          ev.preventDefault();
          setLens(LENSES[Number(ev.key) - 1].key);
          return;
        }
      }
      if (ev.key === "/") {
        ev.preventDefault();
        inputRef.current?.focus();
        setQuery("/");
      } else if (ev.key === " ") {
        ev.preventDefault();
        if (playing) setPlaying(false);
        else play();
      } else if (ev.key === "Enter" && tag !== "BUTTON") {
        const id = hovered ?? ranked[0]?.e.id;
        if (id) openFocus(id);
      } else if (ev.key.startsWith("Arrow") && ranked.length) {
        ev.preventDefault();
        const order = ev.key === "ArrowLeft" || ev.key === "ArrowRight" ? [...ranked].sort((a, b) => a.e.first - b.e.first) : ranked;
        const step = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1;
        const at = order.findIndex((b) => b.e.id === hovered);
        const next = order[at < 0 ? (step > 0 ? 0 : order.length - 1) : (at + step + order.length) % order.length];
        const cluster = bodies.find((b) => b.e.id === next.e.id)?.clusterId ?? null;
        setOpenCluster(cluster);
        setHovered(next.e.id);
        requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-star="${next.e.id}"]`)?.focus({ preventScroll: true }));
        if (view.k > 1) setView((v) => ({ ...v, x: size.w / 2 - next.x * v.k, y: size.h / 2 - next.y * v.k }));
      } else if (ev.key === "Escape") {
        setHovered(null);
        setOpenCluster(null);
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId, playing, play, ranked, openFocus, hovered, view.k, size.w, size.h, bodies, sentenceMode, lead, word, lastSky]);

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
  const links = useMemo(() => {
    if (!hoveredBody?.e.selected) return [];
    const mine = new Set(hoveredBody.e.reports.map((r) => r.source));
    const others = bodies.filter((b) => b !== hoveredBody && b.e.selected && isVisible(b));
    const near = (a: (typeof others)[number], b: (typeof others)[number]) => Math.abs(a.e.first - hoveredBody.e.first) - Math.abs(b.e.first - hoveredBody.e.first);
    const overlap = (b: (typeof others)[number]) => new Set(b.e.reports.map((r) => r.source).filter((x) => mine.has(x))).size;
    const shared = others
      .filter((b) => overlap(b) > 0)
      .sort((a, b) => overlap(b) - overlap(a) || near(a, b))
      .slice(0, LINK_SHARED_MAX);
    const sameTopic = others
      .filter((b) => b.e.category === hoveredBody.e.category && !shared.includes(b))
      .sort(near)
      .slice(0, LINK_TOPIC_MAX);
    return [...shared.map((b) => ({ b, strong: true })), ...sameTopic.map((b) => ({ b, strong: false }))];
  }, [hoveredBody, bodies, isVisible]);
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
            {sentenceMode === "cover" ? "先读完这一句" : sentenceMode === "open" ? `${ranked.length} 件和「${word}」有关` : `${ranked.length} 件事在发光`}
            {q && sentenceMode === "off" && ` · 匹配“${q}”`}
            {officialOnly && " · 仅一手"}
            {sentenceMode === "off" && ` · ${lensByKey(lens).label}`}
          </p>
          <RefreshControl generatedAt={generatedAt} mode={mode} now={now} />
          {fresh.length > 0 && !lastSky && sentenceMode === "off" && (
            <button
              type="button"
              onClick={() => (setT(null), openFocus(fresh[0].id))}
              className="fade-in pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-1 text-xs font-medium text-bg hover:opacity-90"
            >
              <span className="size-1.5 rounded-full bg-bg" aria-hidden />
              {`刚刚新增 ${fresh.length} 件事`}
              <span aria-hidden>→</span>
            </button>
          )}
        </div>

        <div className="absolute top-5 right-4 z-10 flex flex-col items-end gap-2 sm:top-7 sm:right-8">
          <div className="flex items-center rounded-full border border-line bg-surface/80 backdrop-blur" title={ZOOM_HINT}>
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
          {view.k >= MINIMAP_AT && size.w > 0 && (
            <Minimap
              dots={bodies.filter((b) => b.e.selected && isVisible(b)).map((b) => ({ id: b.e.id, x: b.x, y: b.y, bright: b.heat / maxHeat }))}
              size={size}
              view={view}
              width={compact ? 96 : 140}
              onJump={setView}
            />
          )}
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
          onClick={(ev) => {
            if (!drag.current?.moved && !(ev.target as HTMLElement).closest("[data-star]")) {
              if (sheet) setSheet(null);
              if (openCluster) setOpenCluster(null);
              setHovered(null);
            }
          }}
          aria-label="事件星场"
          role="group"
        >
          <div className={cn("absolute inset-0 origin-top-left", playing && "sky-playing")} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
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
              sentenceMode === "off" &&
              !(compact || coarse || portrait) &&
              LENSES.map((item, i) => {
                const v = (i + 0.5) / LENSES.length;
                const pos = pad.t + v * areaH;
                const on = item.key === lens;
                return (
                  <button
                    key={item.key}
                    type="button"
                    data-lens={item.key}
                    aria-pressed={on}
                    onClick={() => setLens(item.key)}
                    className={cn(
                      "absolute left-4 -translate-y-1/2 rounded-full px-2.5 py-1 text-left text-[12px] sm:left-6",
                      on ? "bg-fg text-bg" : "text-faint hover:text-fg",
                    )}
                    style={{ top: pos }}
                  >
                    {item.label}
                  </button>
                );
              })}

            {hoveredBody && links.length > 0 && (
              <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
                {links.map(({ b, strong }) => (
                  <line
                    key={b.e.id}
                    x1={hoveredBody.x}
                    y1={hoveredBody.y}
                    x2={b.x}
                    y2={b.y}
                    className={cn("link-draw stroke-fg", strong ? "opacity-30" : "opacity-20")}
                    strokeWidth={1}
                    strokeDasharray={strong ? undefined : "3 4"}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            )}
            {size.w > 0 &&
              [...bodies]
                .sort((a, b) => a.heat - b.heat)
                .map((b) => {
                  if (sentenceMode === "cover") return null;
                  if (sentenceMode === "off" && !lensMatches(b.e, lens)) return null;
                  const visible = isVisible(b);
                  const piled = b.role === "member" && b.clusterId !== openCluster;
                  if (piled) return null;
                  const hollow = sentenceMode === "off" && Boolean(lastSky) && cut < 0.98 && isThen(b.e);
                  const match = !q || matches(b.e, q);
                  const star = b.e.selected;
                  const d = star ? b.r * 2 : 3;
                  const glow = star ? Math.round(6 + (b.e.score / 100) * 26 * (0.4 + b.heat / maxHeat)) : 0;
                  const apart = Boolean(openCluster && b.clusterId !== openCluster);
                  const opacity = !visible ? 0 : !match ? 0.08 : star ? (0.78 + (b.e.score / 100) * 0.22) * (apart ? 0.28 : 1) : 0.25;
                  const recent = star && t - b.e.first < 6 * 3600_000 && t >= b.e.first;
                  const ring = star && !hollow ? "0 0 0 1.5px var(--bg)" : "";
                  const bloom = !hollow && glow ? `0 0 ${glow}px ${glow / 3}px color-mix(in oklab, var(--fg) 28%, transparent)` : "";
                  const hollowRing = hollow ? "inset 0 0 0 1.5px var(--fg)" : "";
                  return (
                    <button
                      key={sentenceMode === "open" ? `${b.e.id}-${word}` : b.e.id}
                      data-star={b.e.id}
                      type="button"
                      tabIndex={visible && star ? 0 : -1}
                      aria-hidden={!visible || !star}
                      aria-label={
                        b.count > 1 && b.clusterId !== openCluster
                          ? `${b.e.title}，此处叠了 ${b.count} 件事，点按展开`
                          : `${b.e.title}，${b.e.categoryLabel}，${b.e.sourceCount} 个来源，评分 ${b.e.score}`
                      }
                      onMouseEnter={() => {
                        if (pointerType.current === "touch") return;
                        armHover(b.e.id);
                        setOpenCluster(b.clusterId);
                      }}
                      onMouseLeave={() => {
                        if (pointerType.current === "touch") return;
                        armHover(null);
                      }}
                      onFocus={() => (setHovered(b.e.id), b.clusterId && setOpenCluster(b.clusterId))}
                      onBlur={() => setHovered((h) => (h === b.e.id ? null : h))}
                      onPointerDown={(ev) => (pointerType.current = ev.pointerType)}
                      onClick={() => {
                        if (drag.current?.moved || !star) return;
                        if (b.count > 1 && openCluster !== b.clusterId) {
                          setOpenCluster(b.clusterId);
                          if (pointerType.current !== "touch") setHovered(b.e.id);
                          return;
                        }
                        if (pointerType.current === "touch") {
                          setSheet(b.e.id);
                          setHovered(b.e.id);
                          return;
                        }
                        openFocus(b.e.id);
                      }}
                      className={cn(
                        "star absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-4 focus-visible:ring-offset-bg",
                        hollow ? "bg-transparent" : star ? "bg-fg" : "pointer-events-none bg-dim",
                        recent && !reduced && !hollow && "star-pulse",
                        star && freshIds.has(b.e.id) && !hollow && "star-new",
                        !visible && "pointer-events-none",
                        entering && sentenceMode === "off" && "star-enter",
                        sentenceMode === "open" && !reduced && "star-fall",
                        b.clusterId === openCluster && "z-20",
                      )}
                      style={{
                        left: b.x,
                        top: b.y,
                        width: d,
                        height: d,
                        opacity: hollow ? Math.min(opacity, 0.72) : opacity,
                        animationDelay: entering ? `${Math.round(b.u * ENTER_MS)}ms` : undefined,
                        boxShadow: [hollowRing, ring, bloom].filter(Boolean).join(", ") || undefined,
                        ["--fall-x" as string]: `${fallFrom.x}px`,
                        ["--fall-y" as string]: `${fallFrom.y}px`,
                      }}
                    >
                      {b.count > 1 && b.clusterId !== openCluster && (
                        <span
                          aria-hidden
                          className="absolute flex size-4 items-center justify-center rounded-full border border-line bg-bg font-mono text-[10px] text-fg"
                          style={{ left: "68%", top: "68%" }}
                        >
                          {b.count}
                        </span>
                      )}
                    </button>
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
          {sentenceMode === "off" && lastSky && !(compact || coarse || portrait) && view.k === 1 && (
            <div
              data-exposure
              role="slider"
              tabIndex={0}
              aria-label="那时和现在的分界"
              aria-valuemin={8}
              aria-valuemax={100}
              aria-valuenow={Math.round(cut * 100)}
              aria-valuetext={cut >= 0.98 ? "现在，今天的天空" : "左边是上次离开时，右边是现在"}
              onKeyDown={(ev) => {
                if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setCut((value) => Math.min(1, Math.max(0.08, value + (ev.key === "ArrowRight" ? 0.04 : -0.04))));
                }
              }}
              className="absolute top-16 bottom-28 z-30 w-8 -translate-x-1/2 cursor-ew-resize"
              style={{ left: pad.l + cut * areaW }}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                const move = (e: PointerEvent) => {
                  const rect = fieldRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const next = (e.clientX - rect.left - pad.l) / Math.max(1, areaW);
                  setCut(Math.min(1, Math.max(0.08, next)));
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
            >
              <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-fg px-2 py-0.5 text-[10px] whitespace-nowrap text-bg">那时 | 现在</span>
              <span className="absolute top-7 bottom-0 left-1/2 w-px -translate-x-1/2 bg-fg/80" />
            </div>
          )}
          </div>

          {!coarse && !sheet && hoveredBody && isVisible(hoveredBody) && hoveredBody.e.selected && (
            <div
              onMouseEnter={() => armHover(hoveredBody.e.id)}
              onMouseLeave={() => armHover(null)}
              className="absolute z-20 w-64 rounded-2xl border border-line bg-surface/95 p-3 shadow-2xl backdrop-blur"
              style={{
                left: Math.min(size.w - 272, Math.max(8, hoveredBody.x * view.k + view.x + 18)),
                top: Math.min(size.h - 340, Math.max(8, hoveredBody.y * view.k + view.y - 20)),
              }}
            >
              <div className="text-[11px] text-faint">
                {hoveredBody.e.categoryLabel} · {hoveredBody.e.sourceCount} 个来源 ·{" "}
                <ScoreBadge score={hoveredBody.e.score} official={hoveredBody.official} selected={hoveredBody.e.selected} embed />
              </div>
              <p className="mt-1 text-sm leading-snug font-medium">{hoveredBody.e.title}</p>
              {sentenceMode === "off" && lensWhy(hoveredBody.e, lens) && (
                <p className="mt-2 text-[11px] leading-relaxed text-dim">落在「{lensByKey(lens).label}」，{lensWhy(hoveredBody.e, lens)}</p>
              )}
              <p className="mt-2 text-[11px] text-faint">
                共振 {hoveredBody.heat.toFixed(1)} · 点击聚焦 · ← → 切换
              </p>
              {hoveredBody.count > 1 && <p className="mt-1 text-[11px] text-faint">同处 {hoveredBody.count} 件事，点其中一个打开</p>}
              {links.length > 0 && <p className="mt-1 text-[11px] text-faint">实线：同一信源报道 · 虚线：同一领域</p>}
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
            {sentenceMode === "off" && (compact || coarse || portrait) && (
              <div className="mb-2 flex gap-1.5 overflow-x-auto" role="group" aria-label="决策透镜">
                {LENSES.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    data-lens={item.key}
                    aria-pressed={item.key === lens}
                    aria-keyshortcuts={String(i + 1)}
                    onClick={() => setLens(item.key)}
                    className={cn("shrink-0 rounded-full px-3 py-1.5 text-[13px]", item.key === lens ? "bg-fg text-bg" : "text-faint")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {sentenceMode === "off" && lastSky && (compact || coarse || portrait) && (
              <label className="mb-2 flex items-center gap-3 text-[11px] text-faint">
                那时
                <input
                  data-exposure
                  type="range"
                  className="scrubber min-w-0 flex-1"
                  min={0.08}
                  max={1}
                  step={0.01}
                  value={cut}
                  onChange={(ev) => setCut(Number(ev.target.value))}
                  aria-label="那时和现在"
                  aria-valuetext={cut >= 0.98 ? "现在" : "那时和现在之间"}
                />
                现在
              </label>
            )}
            <div className="pointer-events-none absolute inset-x-0 -top-1 overflow-hidden px-4 text-center text-xs text-dim" aria-live="polite">
              {caption && (
                <p key={caption.id} className="fade-in truncate">
                  <span className="font-mono text-faint">{hm(caption.first)}</span> · {caption.title}
                </p>
              )}
            </div>
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => (playing ? setPlaying(false) : play())}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-dim hover:border-faint hover:text-fg"
                aria-label={playing ? "暂停回放" : "回放最近 72 小时"}
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <div className="relative min-w-0 flex-1">
                <DensityTrack events={events} now={now} t={t} />
                <input
                  type="range"
                  className="scrubber relative w-full"
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
              </div>
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

        {lead && sentenceMode !== "off" && (
        <SentenceSky
          lead={lead}
          open={sentenceMode === "open"}
          active={word}
          onPick={(next, el) => {
            const field = fieldRef.current?.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            if (field) setFallFrom({ x: rect.left - field.left + rect.width / 2, y: rect.top - field.top + rect.height / 2 });
            if (word === next && sentenceMode === "open") {
              setSentence("cover");
              setWord(null);
              return;
            }
            setWord(next);
            setSentence("open");
          }}
          onSky={() => setSentence("off")}
        />
      )}

        {sheet && !focusId && (() => {
          const b = bodies.find((x) => x.e.id === sheet);
          if (!b) return null;
          const close = () => (setSheet(null), setHovered(null));
          const why = sentenceMode === "off" ? lensWhy(b.e, lens) : null;
          return <StarSheet e={b.e} heat={b.heat} why={why ? `落在「${lensByKey(lens).label}」，${why}` : null} onClose={close} onOpen={() => (close(), openFocus(b.e.id))} />;
        })()}

        {focusId && focusSlides.length > 0 && (
          <FocusReel
            slides={focusSlides}
            initial={focusIndex}
            noteFor={sentenceMode === "off" ? (e) => {
              const why = lensWhy(e, lens);
              return why ? `落在「${lensByKey(lens).label}」，${why}` : null;
            } : undefined}
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
