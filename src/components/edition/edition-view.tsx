import Link from "next/link";
import type { Edition, Store } from "@/engine/types";
import { EmptyState } from "@/components/story/marks";
import { StandaloneReel } from "@/components/sky/standalone-reel";
import type { Slide } from "@/components/sky/focus-reel";
import { EditionPicker } from "./edition-picker";
import { issueNo, shortDate } from "@/lib/format";
import { toSkyEvent } from "@/lib/sky";

/** 日报 = 一卷可以翻的放映：封面 → 要闻 → 各栏目 → 快讯。 */
export function EditionView({ store, edition }: { store: Store; edition: Edition }) {
  const byId = new Map(store.events.map((e) => [e.id, e]));
  const entries = [edition.lead, ...edition.sections.flatMap((s) => s.entries), ...edition.briefs].filter((x) => x !== null);
  const seen = new Set<string>();
  const events = entries.flatMap((x) => {
    const e = byId.get(x.eventId);
    if (!e || seen.has(e.id)) return [];
    seen.add(e.id);
    return [toSkyEvent(store, e)];
  });

  const slides: Slide[] = [
    {
      kind: "cover",
      eyebrow: `日报 · ${issueNo(edition.no)}`,
      title: shortDate(edition.date),
      lines: [
        `收稿 ${edition.stats.collected} 篇，入选 ${edition.stats.selected} 篇`,
        `归成 ${edition.stats.events} 件事，来自 ${edition.stats.sources} 个信源`,
        events.length ? `本卷 ${events.length} 帧` : "这一天没有入选的事件",
      ],
    },
    ...events.map((e) => ({ kind: "event" as const, e })),
  ];

  return (
    <>
      <h1 className="sr-only">日报 {shortDate(edition.date)}</h1>
      <StandaloneReel
        label={`日报 ${shortDate(edition.date)}`}
        slides={slides}
        initial={0}
        top={
          <EditionPicker current={edition.date} options={store.editions.map((e) => ({ value: e.date, label: shortDate(e.date) }))} />
        }
      />
    </>
  );
}

export function EmptyEdition() {
  return (
    <EmptyState title="还没有日报" action={<Link href="/" className="text-sm text-fg underline underline-offset-4">回到星场</Link>}>
      流水线第一次跑完后，这里会出现第一卷日报。
    </EmptyState>
  );
}
