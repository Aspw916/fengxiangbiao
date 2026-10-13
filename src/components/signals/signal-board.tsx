"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface SignalRow {
  id: string;
  eventId: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  sourceName: string;
  tier: "T1" | "T2";
  score: number;
  scores: [number, number];
  selected: boolean;
  rel: string;
}

const BIN = 5;

function Histogram({ rows, floor }: { rows: SignalRow[]; floor: number }) {
  const bins = Array.from({ length: 100 / BIN }, (_, i) => rows.filter((r) => Math.min(99, r.score) >= i * BIN && Math.min(99, r.score) < (i + 1) * BIN).length);
  const max = Math.max(1, ...bins);
  return (
    <div className="flex h-16 items-end gap-[3px]" aria-hidden>
      {bins.map((n, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-[2px] transition-colors duration-200", (i + 1) * BIN > floor ? "bg-fg" : "bg-raised")}
          style={{ height: `${n ? Math.max(8, (n / max) * 100) : 0}%` }}
          title={`${i * BIN}–${(i + 1) * BIN} 分：${n} 条`}
        />
      ))}
    </div>
  );
}

function Row({ r, faded }: { r: SignalRow; faded?: boolean }) {
  return (
    <li className={cn("transition-opacity duration-300", faded && "opacity-50")}>
      <Link href={`/event/${r.eventId}`} data-nav className="-mx-3 grid grid-cols-[2.75rem_1fr] gap-3 rounded-2xl px-3 py-4 outline-none hover:bg-surface focus-visible:bg-surface">
        <span className="pt-0.5">
          <span className={cn("block font-mono text-base leading-none font-medium tabular-nums", r.selected ? "text-fg" : "text-faint")}>{r.score}</span>
          <span className="mt-1.5 block font-mono text-[10px] text-faint tabular-nums">
            {r.scores[0]}·{r.scores[1]}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug font-medium">{r.title}</span>
          {!faded && <span className="mt-1 line-clamp-2 block text-sm leading-6 text-dim">{r.summary}</span>}
          <span className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-faint">
            <span className={cn(r.tier === "T1" && "text-dim")}>{r.sourceName}</span>
            <span>·</span>
            <span>{r.categoryLabel}</span>
            <span>·</span>
            <span>{r.rel}</span>
            {r.selected && <span className="ml-1 rounded-full border border-line px-1.5 text-[10px] text-dim">入选</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex rounded-full border border-line p-0.5" role="radiogroup" aria-label={label}>
      {options.map(([k, text]) => (
        <button
          key={k}
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn("h-7 rounded-full px-3 text-xs transition-colors", value === k ? "bg-raised text-fg" : "text-dim hover:text-fg")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function SignalBoard({
  rows,
  categories,
  initialCategory,
  defaultFloor,
}: {
  rows: SignalRow[];
  categories: { key: string; label: string }[];
  initialCategory: string;
  defaultFloor: number;
}) {
  const [floor, setFloor] = useState(defaultFloor);
  const [category, setCategory] = useState(initialCategory);
  const [tier, setTier] = useState<"all" | "T1" | "T2">("all");
  const [showNoise, setShowNoise] = useState(false);

  const scoped = useMemo(
    () => rows.filter((r) => (category === "all" || r.category === category) && (tier === "all" || r.tier === tier)),
    [rows, category, tier],
  );
  const signal = scoped.filter((r) => r.score >= floor);
  const noise = scoped.filter((r) => r.score < floor);

  const pick = (key: string) => {
    setCategory(key);
    const url = new URL(window.location.href);
    if (key === "all") url.searchParams.delete("c");
    else url.searchParams.set("c", key);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[17rem_1fr]">
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-3xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">滤网</h2>
            <span className="font-mono text-2xl font-medium tabular-nums">{floor}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-faint">低于这条线的资料会被折叠。只影响你看到的列表。</p>
          <div className="mt-5">
            <Histogram rows={scoped} floor={floor} />
            <Slider className="mt-3" min={0} max={100} step={1} value={[floor]} onValueChange={(v) => setFloor(Array.isArray(v) ? v[0] : v)} aria-label="滤网分数线" />
          </div>
          <div className="mt-5 flex items-center justify-between text-sm">
            <span>
              <span className="font-medium tabular-nums">{signal.length}</span> <span className="text-dim">条信号</span>
              <span className="text-faint"> · {noise.length} 条折叠</span>
            </span>
            {floor !== defaultFloor && (
              <button onClick={() => setFloor(defaultFloor)} className="text-xs text-faint hover:text-fg">重置</button>
            )}
          </div>
        </section>
        <div>
          <p className="mb-2 text-xs text-faint">信源</p>
          <Segmented value={tier} onChange={setTier} label="信源分级" options={[["all", "全部"], ["T1", "一手"], ["T2", "媒体"]] as const} />
        </div>
      </aside>

      <div>
        <div className="-mx-5 mb-4 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1.5">
            {[{ key: "all", label: "全部" }, ...categories].map((c) => (
              <button
                key={c.key}
                onClick={() => pick(c.key)}
                className={cn(
                  "h-8 rounded-full border px-3.5 text-sm transition-colors",
                  category === c.key ? "border-fg bg-fg text-bg" : "border-line text-dim hover:border-faint hover:text-fg",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {scoped.length === 0 ? (
          <p className="py-16 text-center text-sm text-dim">这个分类暂时没有资料。</p>
        ) : (
          <>
            {signal.length ? (
              <ul className="divide-y divide-line">
                {signal.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm text-dim">分数线太高，没有资料能通过。把滑杆往左拖一点。</p>
            )}
            {noise.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowNoise((v) => !v)}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-line text-sm text-dim hover:text-fg"
                  aria-expanded={showNoise}
                >
                  {showNoise ? "收起" : "展开"}被折叠的 {noise.length} 条
                  <ChevronDown className={cn("size-4 transition-transform", showNoise && "rotate-180")} />
                </button>
                {showNoise && (
                  <ul className="mt-2 divide-y divide-line">
                    {noise.map((r) => (
                      <Row key={r.id} r={r} faded />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
