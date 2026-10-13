import type { Metadata } from "next";
import { getStore, sourceMap } from "@/engine/store";
import { SignalBoard, type SignalRow } from "@/components/signals/signal-board";
import { PageHeader } from "@/components/story/marks";
import { relTime } from "@/lib/format";
import { CATEGORIES, categoryLabel } from "../../../industry/taxonomy";
import { SELECTION } from "../../../industry/selection";

export const metadata: Metadata = { title: "信号" };

export default async function SignalsPage({ searchParams }: PageProps<"/signals">) {
  const { c } = await searchParams;
  const store = await getStore();
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
    rel: relTime(i.publishedAt),
  }));
  const initial = typeof c === "string" && CATEGORIES.some((x) => x.key === c) ? c : "all";

  return (
    <>
      <PageHeader eyebrow="信号" title="所有进站的资料">
        左侧是评分，悬停或点按可以看到它代表什么。一手信源 {SELECTION.thresholds.T1} 分、媒体 {SELECTION.thresholds.T2} 分以上正式入选。
      </PageHeader>
      <SignalBoard rows={rows} categories={CATEGORIES.map((x) => ({ key: x.key, label: x.label }))} initialCategory={initial} defaultFloor={SELECTION.defaultNoiseFloor} />
    </>
  );
}
