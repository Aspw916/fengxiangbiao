import type { Metadata } from "next";
import Link from "next/link";
import { getStore, sourceMap } from "@/engine/store";
import { EmptyState, PageHeader, ResonanceDots, SectionTitle, StatusMark } from "@/components/story/marks";
import { TimelineStrip } from "@/components/story/timeline-strip";
import { itemsOf } from "@/lib/select";
import { currentTime, relTime } from "@/lib/format";
import { categoryLabel } from "../../../industry/taxonomy";
import { HEAT } from "../../../industry/selection";

export const metadata: Metadata = { title: "共振" };

export default async function ResonancePage() {
  const store = await getStore();
  const sources = sourceMap(store);
  const now = Math.min(currentTime(), Date.parse(store.generatedAt) + 3600_000);
  const live = store.events.filter((e) => e.selected && e.heat > 0.05);
  const cooled = store.events.filter((e) => e.selected && e.heat <= 0.05).slice(0, 12);

  return (
    <>
      <PageHeader eyebrow="共振" title="有多少独立的声音在说">
        每个来源只算一次，一手信源权重 ×{HEAT.tierWeight.T1}，每 {HEAT.halfLifeHours} 小时减半，统计最近 {HEAT.windowHours} 小时。
        <span className="mt-3 flex flex-wrap items-center gap-4 text-xs text-faint">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-fg" /> 一手信源</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-faint" /> 媒体与个人</span>
          <span>时间条：左 {HEAT.windowHours} 小时前 → 右 现在</span>
        </span>
      </PageHeader>

      {live.length === 0 ? (
        <EmptyState title="暂时没有形成共振的事件">最近 {HEAT.windowHours} 小时还没有多个来源同时报道的事。</EmptyState>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {live.map((e, idx) => (
            <li key={e.id}>
              <Link href={`/event/${e.id}`} data-nav className="group grid grid-cols-[2rem_1fr] gap-x-4 gap-y-3 py-5 outline-none focus-visible:bg-surface md:grid-cols-[2.5rem_1fr_14rem_3.5rem] md:items-center">
                <span className={`font-mono text-sm tabular-nums ${idx < 3 ? "text-fg" : "text-faint"}`}>{String(idx + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] leading-snug font-medium group-hover:opacity-80">{e.title}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-faint">
                    <span>{categoryLabel(e.category)}</span>
                    <ResonanceDots sourceIds={e.sourceIds} sources={sources} />
                    <span>{e.sourceIds.length} 源 · {e.itemIds.length} 篇</span>
                    <span>{relTime(e.lastSeenAt)}</span>
                    <StatusMark status={e.status} />
                  </span>
                </span>
                <TimelineStrip items={itemsOf(store, e)} sources={sources} now={now} className="col-span-2 md:col-span-1" />
                <span className="hidden text-right font-mono text-base tabular-nums md:block">{e.heat.toFixed(1)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {cooled.length > 0 && (
        <section className="mt-14">
          <SectionTitle>已经冷却</SectionTitle>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {cooled.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 border-b border-line py-3 text-sm">
                <Link href={`/event/${e.id}`} className="text-dim hover:text-fg">{e.title}</Link>
                <span className="shrink-0 text-xs text-faint">{relTime(e.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
