import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStore, sourceMap } from "@/engine/store";
import { Kicker, ResonanceDots, SectionTitle, StatusMark } from "@/components/story/marks";
import { ClipButton } from "@/components/story/clip-button";
import { ReportTimeline, type ReportRow } from "@/components/story/report-timeline";
import { itemsOf } from "@/lib/select";
import { longDate, clock, relTime } from "@/lib/format";
import { categoryLabel } from "../../../../industry/taxonomy";

export async function generateMetadata({ params }: PageProps<"/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = getStore().events.find((x) => x.id === id);
  return e ? { title: e.title, description: e.digest } : { title: "缺页" };
}

export default async function EventPage({ params }: PageProps<"/event/[id]">) {
  const { id } = await params;
  const store = getStore();
  const e = store.events.find((x) => x.id === id);
  if (!e) notFound();
  const sources = sourceMap(store);
  const items = itemsOf(store, e);
  const rows: ReportRow[] = items.map((i) => ({
    id: i.id,
    url: i.url,
    title: i.title,
    originalTitle: i.originalTitle,
    summary: i.summary,
    sourceName: sources.get(i.sourceId)?.name ?? i.sourceId,
    tier: sources.get(i.sourceId)?.tier ?? "T2",
    score: i.score,
    selected: i.selected,
    stamp: `${relTime(i.publishedAt)} · ${clock(i.publishedAt)}`,
    publishedAt: i.publishedAt,
  }));
  const firstHand = e.sourceIds.filter((s) => sources.get(s)?.tier === "T1");
  const media = e.sourceIds.filter((s) => sources.get(s)?.tier !== "T1");
  const related = store.events.filter((x) => x.id !== e.id && x.selected && x.category === e.category).slice(0, 4);

  return (
    <article className="ink-in">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" /> 回到头版
      </Link>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3">
            <Kicker>事件档案 · {categoryLabel(e.category)}</Kicker>
            <StatusMark status={e.status} />
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight font-black text-balance sm:text-4xl">{e.title}</h1>
          <p className="mt-3 text-xs text-ink-soft">
            首次出现于 {longDate(e.firstSeenAt)} {clock(e.firstSeenAt)}，最近更新 {relTime(e.lastSeenAt)}
          </p>
          <p className="dropcap mt-6 text-[17px] leading-8">{e.digest}</p>
          {e.reason && (
            <blockquote className="mt-5 border-l-2 border-vermilion pl-4 font-serif text-[15px] text-ink-soft">
              <span className="mr-2 font-bold text-ink">为什么值得看</span>
              {e.reason}
            </blockquote>
          )}
          <div className="mt-5">
            <ClipButton clip={{ eventId: e.id, title: e.title, summary: e.digest }} withLabel />
          </div>
          <div className="mt-10">
            <ReportTimeline rows={rows} />
          </div>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section>
            <SectionTitle>档案卡</SectionTitle>
            <dl className="grid grid-cols-2 gap-px border border-rule bg-rule">
              {[
                ["独立来源", e.sourceIds.length],
                ["报道篇数", e.itemIds.length],
                ["共振值", e.heat.toFixed(1)],
                ["最高评分", e.score],
              ].map(([k, v]) => (
                <div key={k} className="bg-paper p-3">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="mt-1 font-mono text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <SectionTitle>谁在说</SectionTitle>
            <div className="mb-3">
              <ResonanceDots sourceIds={e.sourceIds} sources={sources} size="md" />
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-verdigris">一手信源 · {firstHand.length}</dt>
                <dd>{firstHand.map((s) => sources.get(s)?.name).join("、") || "暂无官方发声"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">媒体与个人 · {media.length}</dt>
                <dd>{media.map((s) => sources.get(s)?.name).join("、") || "暂无媒体跟进"}</dd>
              </div>
            </dl>
          </section>
          {related.length > 0 && (
            <section>
              <SectionTitle>同栏目</SectionTitle>
              <ul className="divide-y divide-rule">
                {related.map((r) => (
                  <li key={r.id} className="py-2">
                    <Link href={`/event/${r.id}`} className="text-sm leading-6 hover:text-vermilion">{r.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
