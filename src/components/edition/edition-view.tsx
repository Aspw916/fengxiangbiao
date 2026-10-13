import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Edition, Store } from "@/engine/types";
import { EmptyState, Eyebrow } from "@/components/story/marks";
import { issueNo, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EditionView({ store, edition }: { store: Store; edition: Edition }) {
  const idx = store.editions.findIndex((e) => e.date === edition.date);
  const newer = store.editions[idx - 1];
  const older = store.editions[idx + 1];
  const offsets = edition.sections.map((_, i) => edition.sections.slice(0, i).reduce((sum, s) => sum + s.entries.length, 0));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="-mx-5 mb-10 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1.5">
          {store.editions.map((e) => (
            <li key={e.date}>
              <Link
                href={`/edition/${e.date}`}
                className={cn(
                  "flex h-8 items-center rounded-full border px-3.5 text-sm transition-colors",
                  e.date === edition.date ? "border-fg bg-fg text-bg" : "border-line text-dim hover:border-faint hover:text-fg",
                )}
              >
                {shortDate(e.date)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <header>
        <Eyebrow>日报 · {issueNo(edition.no)}</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{shortDate(edition.date)}</h1>
        <p className="mt-3 text-[15px] text-dim">
          收稿 {edition.stats.collected} 篇，入选 {edition.stats.selected} 篇，归成 {edition.stats.events} 件事
        </p>
      </header>

      {edition.lead && (
        <Link href={`/event/${edition.lead.eventId}`} data-nav className="mt-10 block rounded-3xl border border-line bg-surface p-6 outline-none hover:border-faint focus-visible:border-faint">
          <p className="text-xs font-medium text-dim">今日要闻 · {edition.lead.sourceCount} 个来源</p>
          <h2 className="mt-2 text-xl leading-snug font-semibold sm:text-2xl">{edition.lead.title}</h2>
          <p className="mt-3 text-[15px] leading-7 text-dim">{edition.lead.summary}</p>
        </Link>
      )}

      {edition.sections.map((s, si) => (
        <section key={s.key} className="mt-12">
          <h2 className="mb-2 text-sm font-medium text-faint">{s.title}</h2>
          <ol className="divide-y divide-line">
            {s.entries.map((e, ei) => (
              <li key={e.eventId}>
                <Link href={`/event/${e.eventId}`} data-nav className="-mx-3 grid grid-cols-[2rem_1fr] gap-2 rounded-2xl px-3 py-4 outline-none hover:bg-surface focus-visible:bg-surface">
                  <span className="pt-0.5 font-mono text-xs text-faint tabular-nums">{String(offsets[si] + ei + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-[15px] leading-snug font-medium">{e.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-dim">{e.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {edition.briefs.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-2 text-sm font-medium text-faint">简讯</h2>
          <ul className="space-y-2.5 text-sm">
            {edition.briefs.map((e) => (
              <li key={e.eventId} className="flex gap-3">
                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-faint" />
                <Link href={`/event/${e.eventId}`} className="leading-6 text-dim hover:text-fg">{e.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-14 grid grid-cols-2 gap-3 text-sm" aria-label="翻阅往期">
        {older ? (
          <Link href={`/edition/${older.date}`} className="flex items-center gap-1.5 rounded-2xl border border-line p-4 text-dim hover:border-faint hover:text-fg">
            <ChevronLeft className="size-4" /> {shortDate(older.date)}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link href={`/edition/${newer.date}`} className="flex items-center justify-end gap-1.5 rounded-2xl border border-line p-4 text-dim hover:border-faint hover:text-fg">
            {shortDate(newer.date)} <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

export function EmptyEdition() {
  return <EmptyState title="还没有日报">至少有一条资料入选后，才会生成第一期日报。</EmptyState>;
}
