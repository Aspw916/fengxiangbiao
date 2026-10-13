import type { Metadata } from "next";
import Link from "next/link";
import { getStore, sourceMap } from "@/engine/store";
import { Kicker, ResonanceDots, StatusMark } from "@/components/story/marks";
import { TimelineStrip } from "@/components/story/timeline-strip";
import { itemsOf } from "@/lib/select";
import { currentTime, relTime } from "@/lib/format";
import { categoryLabel } from "../../../industry/taxonomy";
import { HEAT } from "../../../industry/selection";

export const metadata: Metadata = { title: "共振榜" };

export default function ResonancePage() {
  const store = getStore();
  const sources = sourceMap(store);
  const now = Math.min(currentTime(), Date.parse(store.generatedAt) + 3600_000);
  const live = store.events.filter((e) => e.selected && e.heat > 0.05);
  const cooled = store.events.filter((e) => e.selected && e.heat <= 0.05).slice(0, 12);
  const max = Math.max(1, ...live.map((e) => e.heat));

  return (
    <>
      <header className="mb-8 grid gap-4 md:grid-cols-[1fr_20rem] md:items-end">
        <div>
          <Kicker>共振榜</Kicker>
          <h1 className="mt-1 font-serif text-3xl font-black">不看谁喊得响，看有多少独立的声音在说</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            每个来源只算一次，一手信源权重 ×{HEAT.tierWeight.T1}，每过 {HEAT.halfLifeHours} 小时贡献减半，只统计最近 {HEAT.windowHours} 小时。和 {HEAT.compareHours} 小时前相比明显上升的标“攀升”，刚出现的标“新起”。
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-l-2 border-ink pl-4 text-xs text-ink-soft">
          <dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-verdigris" /> 一手信源</dt>
          <dt className="flex items-center gap-2"><span className="size-2 rounded-full border border-ink-soft" /> 媒体与个人</dt>
          <dt className="col-span-2 mt-1">时间条：左端 {HEAT.windowHours} 小时前，右端此刻；每根刻度是一篇报道。</dt>
        </dl>
      </header>

      {live.length === 0 ? (
        <p className="border-y border-rule py-16 text-center text-sm text-ink-soft">最近 {HEAT.windowHours} 小时还没有形成共振的事件。新资料进站后这里会自动更新。</p>
      ) : (
        <ol className="border-t-2 border-ink">
          {live.map((e, idx) => (
            <li key={e.id} className="border-b border-rule">
              <Link href={`/event/${e.id}`} data-nav className="group grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-3 py-4 outline-none focus-visible:bg-paper-deep md:grid-cols-[3rem_1fr_16rem_4.5rem]">
                <span className={`font-serif text-3xl leading-none font-black ${idx < 3 ? "text-vermilion" : "text-ink-soft"}`}>{idx + 1}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <span>{categoryLabel(e.category)}</span>
                    <StatusMark status={e.status} />
                    <span>· {relTime(e.lastSeenAt)}</span>
                  </span>
                  <span className="mt-1 block font-serif text-lg leading-snug font-bold group-hover:text-vermilion">{e.title}</span>
                  <span className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                    <ResonanceDots sourceIds={e.sourceIds} sources={sources} size="md" />
                    {e.sourceIds.length} 个来源 · {e.itemIds.length} 篇报道
                  </span>
                </span>
                <span className="col-span-2 self-center md:col-span-1">
                  <TimelineStrip items={itemsOf(store, e)} sources={sources} now={now} />
                </span>
                <span className="hidden self-center text-right md:block">
                  <span className="block font-mono text-xl">{e.heat.toFixed(1)}</span>
                  <span className="mt-1 ml-auto block h-1 bg-vermilion" style={{ width: `${(e.heat / max) * 100}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {cooled.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 font-serif font-bold text-ink-soft">已经冷却</h2>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {cooled.map((e) => (
              <li key={e.id} className="border-b border-rule py-2 text-sm">
                <Link href={`/event/${e.id}`} className="hover:text-vermilion">{e.title}</Link>
                <span className="ml-2 text-xs text-ink-soft">{relTime(e.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
