import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStore, sourceMap } from "@/engine/store";
import type { Source, StoryEvent } from "@/engine/types";
import { Kicker, ResonanceDots, SectionTitle, StatusMark } from "@/components/story/marks";
import { ClipButton } from "@/components/story/clip-button";
import { frontPage, readingMinutes } from "@/lib/select";
import { clock, relTime } from "@/lib/format";
import { categoryLabel } from "../../industry/taxonomy";

function Barometer({ collected, selected, events }: { collected: number; selected: number; events: number }) {
  const ratio = collected ? selected / collected : 0;
  return (
    <section className="mb-8 grid items-center gap-3 border-b border-rule pb-4 text-sm sm:grid-cols-[auto_1fr_auto]" aria-label="今日气压">
      <span className="font-serif font-bold tracking-wider">今日气压</span>
      <div className="flex items-center gap-3">
        <div className="relative h-1.5 flex-1 bg-paper-deep" role="img" aria-label={`信号占比 ${Math.round(ratio * 100)}%`}>
          <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <span className="font-mono text-xs text-ink-soft">{Math.round(ratio * 100)}% 过线</span>
      </div>
      <p className="text-ink-soft">
        过去 24 小时收到 <b className="font-mono text-ink">{collected}</b> 条资料，滤出 <b className="font-mono text-ink">{selected}</b> 条信号，归成{" "}
        <b className="font-mono text-ink">{events}</b> 件事。
      </p>
    </section>
  );
}

function Byline({ e, sources }: { e: StoryEvent; sources: Map<string, Source> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
      <ResonanceDots sourceIds={e.sourceIds} sources={sources} />
      <span>{e.sourceIds.length} 个来源</span>
      <span>{relTime(e.lastSeenAt)}更新</span>
      <StatusMark status={e.status} />
    </div>
  );
}

function Lead({ e, sources }: { e: StoryEvent; sources: Map<string, Source> }) {
  return (
    <article className="ink-in">
      <Kicker>头条 · {categoryLabel(e.category)}</Kicker>
      <Link href={`/event/${e.id}`} data-nav className="group mt-2 block outline-none focus-visible:ring-2 focus-visible:ring-vermilion">
        <h1 className="font-serif text-3xl leading-tight font-black text-balance group-hover:text-vermilion sm:text-5xl sm:leading-[1.15]">{e.title}</h1>
      </Link>
      <div className="mt-4">
        <Byline e={e} sources={sources} />
      </div>
      <p className="dropcap mt-5 text-[17px] leading-8">{e.digest}</p>
      {e.reason && (
        <blockquote className="mt-5 border-l-2 border-vermilion pl-4 font-serif text-[15px] text-ink-soft">
          <span className="mr-2 font-bold text-ink">编者按</span>
          {e.reason}
        </blockquote>
      )}
      <div className="mt-5 flex items-center gap-4">
        <Link href={`/event/${e.id}`} className="inline-flex items-center gap-1 border-b border-ink pb-0.5 text-sm hover:border-vermilion hover:text-vermilion">
          翻开事件档案 <ArrowRight className="size-3.5" />
        </Link>
        <ClipButton clip={{ eventId: e.id, title: e.title, summary: e.digest }} withLabel />
      </div>
    </article>
  );
}

function Secondary({ e, sources }: { e: StoryEvent; sources: Map<string, Source> }) {
  return (
    <article className="border-t border-rule pt-4">
      <div className="flex items-center justify-between">
        <Kicker className="text-ink-soft">{categoryLabel(e.category)}</Kicker>
        <ClipButton clip={{ eventId: e.id, title: e.title, summary: e.digest }} />
      </div>
      <Link href={`/event/${e.id}`} data-nav className="group mt-1 block outline-none focus-visible:ring-2 focus-visible:ring-vermilion">
        <h2 className="font-serif text-xl leading-snug font-bold group-hover:text-vermilion">{e.title}</h2>
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-soft">{e.digest}</p>
      <div className="mt-3">
        <Byline e={e} sources={sources} />
      </div>
    </article>
  );
}

export default function Home() {
  const store = getStore();
  const sources = sourceMap(store);
  const { lead, secondary, briefs, stats } = frontPage(store);
  const topResonance = store.events.filter((e) => e.selected).slice(0, 5);

  if (!lead) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <Kicker>今日头版</Kicker>
        <h1 className="mt-3 font-serif text-3xl font-bold">今天还没有过线的信号</h1>
        <p className="mt-3 text-sm text-ink-soft">过去 24 小时里收到的资料都没有达到入选门槛。可以去信号台调低滤网看看，或者稍后再来。</p>
        <Link href="/signals" className="mt-6 inline-block border-b-2 border-vermilion pb-0.5 font-serif hover:text-vermilion">
          去信号台
        </Link>
      </div>
    );
  }

  const all = [lead, ...secondary, ...briefs];
  return (
    <>
      <Barometer {...stats} />
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8 lg:border-r lg:border-rule lg:pr-10">
          <Lead e={lead} sources={sources} />
          {secondary.length > 0 && (
            <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {secondary.map((e) => (
                <Secondary key={e.id} e={e} sources={sources} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-10 lg:col-span-4">
          <section>
            <SectionTitle aside={`${briefs.length} 条`}>快讯</SectionTitle>
            {briefs.length ? (
              <ol className="divide-y divide-rule">
                {briefs.map((e) => (
                  <li key={e.id}>
                    <Link href={`/event/${e.id}`} data-nav className="group flex gap-3 py-2.5 outline-none focus-visible:bg-paper-deep">
                      <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-ink-soft">{clock(e.lastSeenAt)}</span>
                      <span className="text-sm leading-6 group-hover:text-vermilion">{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-soft">今天的信号都上了正版，没有余下的快讯。</p>
            )}
          </section>

          <section>
            <SectionTitle aside={<Link href="/resonance" className="hover:text-ink">完整榜单 →</Link>}>共振前五</SectionTitle>
            <ol className="space-y-3">
              {topResonance.map((e, i) => (
                <li key={e.id} className="flex gap-3">
                  <span className="font-serif text-2xl leading-none font-black text-vermilion/80">{i + 1}</span>
                  <div className="min-w-0">
                    <Link href={`/event/${e.id}`} className="line-clamp-2 text-sm leading-6 hover:text-vermilion">
                      {e.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <ResonanceDots sourceIds={e.sourceIds} sources={sources} />
                      <StatusMark status={e.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <section className="mt-14 border-t-[3px] border-double border-ink pt-6 text-center">
        <p className="font-serif text-lg font-bold">今日头版到此读完</p>
        <p className="mt-1 text-sm text-ink-soft">
          共 {all.length} 件事，约 {readingMinutes(all)} 分钟。想看被滤掉的资料，去
          <Link href="/signals" className="mx-1 border-b border-ink hover:text-vermilion">信号台</Link>
          拖动滤网；想按栏目通读，翻开
          <Link href="/edition" className="mx-1 border-b border-ink hover:text-vermilion">今日晨报</Link>。
        </p>
      </section>
    </>
  );
}
