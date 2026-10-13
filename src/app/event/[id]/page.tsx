import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStore, sourceMap } from "@/engine/store";
import { ResonanceDots, SectionTitle, StatusMark } from "@/components/story/marks";
import { ClipButton } from "@/components/story/clip-button";
import { ReportTimeline, type ReportRow } from "@/components/story/report-timeline";
import { itemsOf } from "@/lib/select";
import { clock, longDate, relTime } from "@/lib/format";
import { categoryLabel } from "../../../../industry/taxonomy";

export async function generateMetadata({ params }: PageProps<"/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = (await getStore()).events.find((x) => x.id === id);
  return e ? { title: e.title, description: e.digest } : { title: "未找到" };
}

export default async function EventPage({ params }: PageProps<"/event/[id]">) {
  const { id } = await params;
  const store = await getStore();
  const e = store.events.find((x) => x.id === id);
  if (!e) notFound();
  const sources = sourceMap(store);
  const rows: ReportRow[] = itemsOf(store, e).map((i) => ({
    id: i.id,
    url: i.url,
    title: i.title,
    originalTitle: i.originalTitle,
    summary: i.summary,
    sourceName: sources.get(i.sourceId)?.name ?? i.sourceId,
    tier: sources.get(i.sourceId)?.tier ?? "T2",
    score: i.score,
    selected: i.selected,
    stamp: `${relTime(i.publishedAt)} ${clock(i.publishedAt)}`,
    publishedAt: i.publishedAt,
  }));
  const firstHand = e.sourceIds.filter((s) => sources.get(s)?.tier === "T1");
  const media = e.sourceIds.filter((s) => sources.get(s)?.tier !== "T1");
  const related = store.events.filter((x) => x.id !== e.id && x.selected && x.category === e.category).slice(0, 4);

  return (
    <article className="fade-in">
      <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-faint hover:text-fg">
        <ArrowLeft className="size-4" /> 返回
      </Link>

      <div className="grid gap-12 lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
            <span>{categoryLabel(e.category)}</span>
            <span>·</span>
            <span>首次出现 {longDate(e.firstSeenAt)} {clock(e.firstSeenAt)}</span>
            <StatusMark status={e.status} />
          </div>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{e.title}</h1>
          <p className="mt-6 text-[17px] leading-8 text-dim">{e.digest}</p>
          {e.reason && (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-[15px] leading-7">
              <p className="text-xs font-medium text-faint">为什么重要</p>
              <p className="mt-1">{e.reason}</p>
            </div>
          )}
          <div className="mt-6">
            <ClipButton clip={{ eventId: e.id, title: e.title, summary: e.digest }} withLabel />
          </div>
          <div className="mt-12">
            <ReportTimeline rows={rows} />
          </div>
        </div>

        <aside className="space-y-10 lg:pt-8">
          <dl className="grid grid-cols-2 gap-2">
            {[
              ["来源", e.sourceIds.length],
              ["报道", e.itemIds.length],
              ["共振", e.heat.toFixed(1)],
              ["最高分", e.score],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-line p-3.5">
                <dt className="text-xs text-faint">{k}</dt>
                <dd className="mt-1 font-mono text-xl tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <section>
            <SectionTitle>谁在说</SectionTitle>
            <ResonanceDots sourceIds={e.sourceIds} sources={sources} size="md" />
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-faint">一手信源 · {firstHand.length}</dt>
                <dd className="mt-0.5 text-dim">{firstHand.map((s) => sources.get(s)?.name).join("、") || "暂无官方发声"}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">媒体与个人 · {media.length}</dt>
                <dd className="mt-0.5 text-dim">{media.map((s) => sources.get(s)?.name).join("、") || "暂无媒体跟进"}</dd>
              </div>
            </dl>
          </section>
          {related.length > 0 && (
            <section>
              <SectionTitle>相关</SectionTitle>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/event/${r.id}`} className="text-sm leading-6 text-dim hover:text-fg">{r.title}</Link>
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
