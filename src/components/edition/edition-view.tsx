import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Edition, Store } from "@/engine/types";
import { Kicker } from "@/components/story/marks";
import { issueNo, shortDate } from "@/lib/format";

export function EditionView({ store, edition }: { store: Store; edition: Edition }) {
  const idx = store.editions.findIndex((e) => e.date === edition.date);
  const newer = store.editions[idx - 1];
  const older = store.editions[idx + 1];
  const offsets = edition.sections.map((_, i) => edition.sections.slice(0, i).reduce((sum, s) => sum + s.entries.length, 0));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b-[3px] border-double border-ink pb-5 text-center">
        <Kicker>晨报 · {issueNo(edition.no)}</Kicker>
        <h1 className="mt-2 font-serif text-4xl font-black tracking-wide">{shortDate(edition.date)}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          当日收稿 <b className="font-mono text-ink">{edition.stats.collected}</b> 篇，入选 <b className="font-mono text-ink">{edition.stats.selected}</b> 篇，编为{" "}
          <b className="font-mono text-ink">{edition.stats.events}</b> 件事
        </p>
      </header>

      {edition.lead && (
        <section className="border-b border-rule py-8">
          <p className="mb-2 font-serif text-sm font-bold text-vermilion">今日要闻</p>
          <Link href={`/event/${edition.lead.eventId}`} data-nav className="group block outline-none focus-visible:bg-paper-deep">
            <h2 className="font-serif text-2xl leading-snug font-black group-hover:text-vermilion sm:text-3xl">{edition.lead.title}</h2>
            <p className="dropcap mt-3 leading-7">{edition.lead.summary}</p>
          </Link>
          <p className="mt-2 text-xs text-ink-soft">{edition.lead.sourceCount} 个来源报道</p>
        </section>
      )}

      {edition.sections.map((s, si) => (
        <section key={s.key} className="border-b border-rule py-6">
          <h2 className="mb-4 flex items-center gap-3 font-serif text-sm font-bold tracking-[0.2em]">
            <span className="h-px w-6 bg-ink" />
            {s.title}
          </h2>
          <ol className="space-y-5">
            {s.entries.map((e, ei) => {
              const n = offsets[si] + ei + 1;
              return (
                <li key={e.eventId} className="grid grid-cols-[2rem_1fr] gap-2">
                  <span className="font-mono text-sm text-ink-soft">{String(n).padStart(2, "0")}</span>
                  <Link href={`/event/${e.eventId}`} data-nav className="group outline-none focus-visible:bg-paper-deep">
                    <h3 className="font-serif text-lg leading-snug font-bold group-hover:text-vermilion">{e.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">{e.summary}</p>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {edition.briefs.length > 0 && (
        <section className="py-6">
          <h2 className="mb-3 font-serif text-sm font-bold tracking-[0.2em]">简讯</h2>
          <ul className="space-y-2 text-sm">
            {edition.briefs.map((e) => (
              <li key={e.eventId} className="flex gap-2">
                <span className="text-vermilion">■</span>
                <Link href={`/event/${e.eventId}`} className="hover:text-vermilion">{e.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-6 grid grid-cols-2 border-t-2 border-ink pt-4 text-sm" aria-label="翻阅往期">
        {older ? (
          <Link href={`/edition/${older.date}`} className="inline-flex items-center gap-1 hover:text-vermilion">
            <ChevronLeft className="size-4" /> 上一期 · {shortDate(older.date)}
          </Link>
        ) : (
          <span className="text-ink-soft">已是最早一期</span>
        )}
        {newer ? (
          <Link href={`/edition/${newer.date}`} className="inline-flex items-center justify-end gap-1 hover:text-vermilion">
            下一期 · {shortDate(newer.date)} <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="text-right text-ink-soft">已是最新一期</span>
        )}
      </nav>

      <section className="mt-10">
        <h2 className="mb-3 text-xs tracking-widest text-ink-soft">往期归档</h2>
        <ul className="flex flex-wrap gap-2">
          {store.editions.map((e) => (
            <li key={e.date}>
              <Link
                href={`/edition/${e.date}`}
                className={`block border px-3 py-1.5 text-xs ${e.date === edition.date ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}
              >
                <span className="font-mono">{issueNo(e.no)}</span> · {shortDate(e.date)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function EmptyEdition() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <Kicker>晨报</Kicker>
      <h1 className="mt-3 font-serif text-3xl font-bold">还没有出过刊</h1>
      <p className="mt-3 text-sm text-ink-soft">至少要有一条资料入选，才会编出第一期晨报。运行一次流水线后再来看看。</p>
    </div>
  );
}
