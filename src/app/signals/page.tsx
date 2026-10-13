import type { Metadata } from "next";
import { getStore, sourceMap } from "@/engine/store";
import { SignalBoard, type SignalRow } from "@/components/signals/signal-board";
import { Kicker } from "@/components/story/marks";
import { clock, relTime } from "@/lib/format";
import { CATEGORIES, categoryLabel } from "../../../industry/taxonomy";
import { SELECTION } from "../../../industry/selection";

export const metadata: Metadata = { title: "信号台" };

export default async function SignalsPage({ searchParams }: PageProps<"/signals">) {
  const { c } = await searchParams;
  const store = getStore();
  const sources = sourceMap(store);
  const rows: SignalRow[] = store.items.map((i) => ({
    id: i.id,
    eventId: i.eventId,
    title: i.title,
    summary: i.summary,
    category: i.category,
    categoryLabel: categoryLabel(i.category),
    sourceName: sources.get(i.sourceId)?.name ?? i.sourceId,
    tier: sources.get(i.sourceId)?.tier ?? "T2",
    score: i.score,
    scores: i.scores,
    selected: i.selected,
    time: clock(i.publishedAt),
    rel: relTime(i.publishedAt),
  }));
  const initial = typeof c === "string" && CATEGORIES.some((x) => x.key === c) ? c : "all";

  return (
    <>
      <header className="mb-6">
        <Kicker>信号台</Kicker>
        <h1 className="mt-1 font-serif text-3xl font-black">所有进站的资料，都在这里过一遍滤网</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          每条资料由评分器独立打两次分，左侧大号数字是平均分，下方是两次的原始分。朱红色的分数代表它已经按信源分级门槛（一手 {SELECTION.thresholds.T1} 分、媒体 {SELECTION.thresholds.T2} 分）正式入选。
        </p>
      </header>
      <SignalBoard
        rows={rows}
        categories={CATEGORIES.map((x) => ({ key: x.key, label: x.label }))}
        initialCategory={initial}
        defaultFloor={SELECTION.defaultNoiseFloor}
      />
    </>
  );
}
