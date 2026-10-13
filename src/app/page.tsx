import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStore, sourceMap } from "@/engine/store";
import type { Source, StoryEvent } from "@/engine/types";
import { EmptyState, ResonanceDots, SectionTitle, StatusMark } from "@/components/story/marks";
import { ClipButton } from "@/components/story/clip-button";
import { HeroSearch } from "@/components/site/hero-search";
import { frontPage, readingMinutes } from "@/lib/select";
import { clock, currentTime, longDate, relTime } from "@/lib/format";
import { categoryLabel } from "../../industry/taxonomy";

function Meta({ e, sources }: { e: StoryEvent; sources: Map<string, Source> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
      <span>{categoryLabel(e.category)}</span>
      <ResonanceDots sourceIds={e.sourceIds} sources={sources} />
      <span>{e.sourceIds.length} 个来源</span>
      <span>{relTime(e.lastSeenAt)}</span>
      <StatusMark status={e.status} />
    </div>
  );
}

function Lead({ e, sources }: { e: StoryEvent; sources: Map<string, Source> }) {
  return (
    <article className="fade-in rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <p className="text-xs font-medium text-dim">今日要闻</p>
      <Link href={`/event/${e.id}`} data-nav className="group mt-3 block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-faint">
        <h2 className="text-2xl leading-snug font-semibold tracking-tight text-balance group-hover:opacity-80 sm:text-[28px]">{e.title}</h2>
      </Link>
      <p className="mt-4 text-[15px] leading-7 text-dim">{e.digest}</p>
      {e.reason && <p className="mt-3 text-[15px] leading-7 text-dim"><span className="text-fg">为什么重要：</span>{e.reason}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Meta e={e} sources={sources} />
        <div className="flex items-center gap-2">
          <ClipButton clip={{ eventId: e.id, title: e.title, summary: e.digest }} withLabel />
          <Link href={`/event/${e.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-fg px-4 text-sm font-medium text-bg hover:opacity-90">
            查看详情 <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Row({ e, sources }: { e: StoryEvent; sources: Map<string, Source> }) {
  return (
    <li className="group relative">
      <Link href={`/event/${e.id}`} data-nav className="-mx-3 block rounded-2xl px-3 py-4 outline-none transition-colors hover:bg-surface focus-visible:bg-surface">
        <h3 className="pr-10 text-[16px] leading-snug font-medium">{e.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-dim">{e.digest}</p>
        <div className="mt-2.5">
          <Meta e={e} sources={sources} />
        </div>
      </Link>
      <ClipButton clip={{ eventId: e.id, title: e.title, summary: e.digest }} className="absolute top-3 right-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
    </li>
  );
}

export default async function Home() {
  const store = await getStore();
  const sources = sourceMap(store);
  const { lead, secondary, briefs, stats } = frontPage(store);
  const all = lead ? [lead, ...secondary, ...briefs] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <section className="pt-6 pb-12 text-center sm:pt-14">
        <p className="text-sm text-faint">{longDate(currentTime())}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">今天 AI 发生了什么</h1>
        <p className="mt-4 text-[15px] text-dim">
          过去 24 小时 {stats.collected} 篇资料，{stats.selected} 篇过线，归成 {stats.events} 件事
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <HeroSearch />
        </div>
      </section>

      {!lead ? (
        <EmptyState
          title="今天还没有过线的事件"
          action={<Link href="/signals" className="text-sm text-fg underline underline-offset-4">去信号页调低滤网</Link>}
        >
          过去 24 小时收到的资料都没有达到入选门槛，稍后再来看看。
        </EmptyState>
      ) : (
        <>
          <Lead e={lead} sources={sources} />

          {secondary.length > 0 && (
            <section className="mt-12">
              <SectionTitle aside={<Link href="/resonance" className="hover:text-fg">共振榜 →</Link>}>值得一看</SectionTitle>
              <ul className="divide-y divide-line">
                {secondary.map((e) => (
                  <Row key={e.id} e={e} sources={sources} />
                ))}
              </ul>
            </section>
          )}

          {briefs.length > 0 && (
            <section className="mt-12">
              <SectionTitle aside={`${briefs.length} 条`}>快讯</SectionTitle>
              <ul className="divide-y divide-line">
                {briefs.map((e) => (
                  <li key={e.id}>
                    <Link href={`/event/${e.id}`} data-nav className="-mx-3 flex gap-4 rounded-xl px-3 py-3 text-sm outline-none hover:bg-surface focus-visible:bg-surface">
                      <span className="w-11 shrink-0 font-mono text-xs leading-6 text-faint">{clock(e.lastSeenAt)}</span>
                      <span className="leading-6">{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-16 text-center text-sm text-faint">
            今天就这些 · {all.length} 件事，约 {readingMinutes(all)} 分钟读完 ·{" "}
            <Link href="/edition" className="text-dim hover:text-fg">看日报</Link>
          </p>
        </>
      )}
    </div>
  );
}
