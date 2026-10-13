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
  time: string;
  rel: string;
}

const BIN = 5;

function Histogram({ rows, floor }: { rows: SignalRow[]; floor: number }) {
  const bins = Array.from({ length: 100 / BIN }, (_, i) => rows.filter((r) => Math.min(99, r.score) >= i * BIN && Math.min(99, r.score) < (i + 1) * BIN).length);
  const max = Math.max(1, ...bins);
  return (
    <div className="flex h-20 items-end gap-[3px]" aria-hidden>
      {bins.map((n, i) => (
        <div
          key={i}
          className={cn("flex-1 transition-colors duration-200", (i + 1) * BIN > floor ? "bg-ink" : "bg-rule")}
          style={{ height: `${n ? Math.max(6, (n / max) * 100) : 0}%` }}
          title={`${i * BIN}–${(i + 1) * BIN} 分：${n} 条`}
        />
      ))}
    </div>
  );
}

function Row({ r, faded }: { r: SignalRow; faded?: boolean }) {
  return (
    <li className={cn("border-b border-rule transition-opacity duration-300", faded && "opacity-45")}>
      <Link href={`/event/${r.eventId}`} data-nav className="group grid grid-cols-[3.25rem_1fr] gap-3 py-3 outline-none focus-visible:bg-paper-deep sm:grid-cols-[3.25rem_1fr_7rem]">
        <span className="pt-0.5 text-center">
          <span className={cn("block font-mono text-lg leading-none font-medium", r.selected ? "text-vermilion" : "text-ink-soft")}>{r.score}</span>
          <span className="mt-1 block font-mono text-[10px] text-ink-soft">
            {r.scores[0]}/{r.scores[1]}
          </span>
        </span>
        <span className="min-w-0">
          <span className="font-serif text-[16px] leading-snug font-bold group-hover:text-vermilion">{r.title}</span>
          {!faded && <span className="mt-1 line-clamp-2 block text-sm leading-6 text-ink-soft">{r.summary}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft sm:hidden">
            {r.sourceName} · {r.rel}
          </span>
        </span>
        <span className="hidden text-right text-xs leading-5 text-ink-soft sm:block">
          <span className={cn("block", r.tier === "T1" && "text-verdigris")}>{r.sourceName}</span>
          <span className="block">{r.categoryLabel}</span>
          <span className="block font-mono">{r.rel}</span>
        </span>
      </Link>
    </li>
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
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <section className="border border-ink p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif font-bold">信噪比滤网</h2>
            <span className="font-mono text-2xl font-medium text-vermilion">{floor}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-soft">拖动滑杆，平均分低于这条线的资料会被当作噪声折叠。只影响你看到的列表，不改变入选结果。</p>
          <div className="mt-4">
            <Histogram rows={scoped} floor={floor} />
            <Slider
              className="mt-2"
              min={0}
              max={100}
              step={1}
              value={[floor]}
              onValueChange={(v) => setFloor(Array.isArray(v) ? v[0] : v)}
              aria-label="信噪比门槛"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-soft">
              <span>0 全部放行</span>
              <span>100 只留头条</span>
            </div>
          </div>
          <p className="mt-4 border-t border-rule pt-3 text-sm">
            <b className="font-mono">{signal.length}</b> 条信号 · <span className="text-ink-soft">{noise.length} 条噪声</span>
          </p>
          <button onClick={() => setFloor(defaultFloor)} className="mt-2 text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline">
            恢复编辑部默认（{defaultFloor}）
          </button>
        </section>

        <section>
          <h3 className="mb-2 text-xs tracking-widest text-ink-soft">信源分级</h3>
          <div className="grid grid-cols-3 border border-ink text-sm" role="radiogroup" aria-label="信源分级">
            {([["all", "全部"], ["T1", "一手"], ["T2", "媒体"]] as const).map(([k, label]) => (
              <button
                key={k}
                role="radio"
                aria-checked={tier === k}
                onClick={() => setTier(k)}
                className={cn("py-1.5 not-last:border-r not-last:border-ink", tier === k ? "bg-ink text-paper" : "hover:bg-paper-deep")}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <div>
        <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-5 border-b border-rule text-sm">
            {[{ key: "all", label: "全部栏目" }, ...categories].map((c) => (
              <li key={c.key}>
                <button
                  onClick={() => pick(c.key)}
                  className={cn("-mb-px border-b-2 pb-2 font-serif", category === c.key ? "border-vermilion text-vermilion" : "border-transparent hover:text-vermilion")}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {scoped.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-soft">这个栏目暂时没有资料。换一个栏目，或把信源分级切回“全部”。</p>
        ) : (
          <>
            {signal.length ? (
              <ul>
                {signal.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </ul>
            ) : (
              <p className="border-b border-rule py-10 text-center text-sm text-ink-soft">滤网太密了，没有资料能过线。把滑杆往左拖一点。</p>
            )}
            {noise.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowNoise((v) => !v)}
                  className="flex w-full items-center justify-between border-y border-dashed border-rule py-2 text-sm text-ink-soft hover:text-ink"
                  aria-expanded={showNoise}
                >
                  <span>被滤网拦下的 {noise.length} 条</span>
                  <ChevronDown className={cn("size-4 transition-transform", showNoise && "rotate-180")} />
                </button>
                {showNoise && (
                  <ul>
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
