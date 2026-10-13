import type { Metadata } from "next";
import { getStore } from "@/engine/store";
import { PageHeader } from "@/components/story/marks";
import { relTime } from "@/lib/format";
import { SELECTION } from "../../../industry/selection";

export const metadata: Metadata = { title: "信源" };

export default async function SourcesPage() {
  const store = await getStore();
  const rows = store.sources
    .map((s) => {
      const items = store.items.filter((i) => i.sourceId === s.id);
      const picked = items.filter((i) => i.selected).length;
      return { s, total: items.length, picked, rate: items.length ? picked / items.length : 0, last: items[0]?.publishedAt };
    })
    .sort((a, b) => a.s.tier.localeCompare(b.s.tier) || b.picked - a.picked);

  return (
    <>
      <PageHeader eyebrow="信源" title={`${store.sources.length} 个信源`}>
        一手信源（官方博客、研究机构）入选线 {SELECTION.thresholds.T1} 分，媒体与个人 {SELECTION.thresholds.T2} 分。名单在 <code className="font-mono text-fg">industry/sources.json</code>。
      </PageHeader>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-faint">
              <th className="px-4 py-3 font-normal">信源</th>
              <th className="px-4 py-3 font-normal">类型</th>
              <th className="px-4 py-3 text-right font-normal">收稿</th>
              <th className="px-4 py-3 text-right font-normal">入选</th>
              <th className="w-40 px-4 py-3 font-normal">入选率</th>
              <th className="px-4 py-3 text-right font-normal">最近</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ s, total, picked, rate, last }) => (
              <tr key={s.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <a href={s.homepage} target="_blank" rel="noreferrer" className="font-medium hover:opacity-80">{s.name}</a>
                  <span className="block font-mono text-[11px] text-faint">{new URL(s.feedUrl).host}</span>
                </td>
                <td className="px-4 py-3 text-dim">{s.tier === "T1" ? "一手" : "媒体"}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-dim">{total}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{picked}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                      <div className="h-full rounded-full bg-fg" style={{ width: `${Math.round(rate * 100)}%` }} />
                    </div>
                    <span className="w-9 text-right font-mono text-xs tabular-nums text-dim">{Math.round(rate * 100)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-faint">{last ? relTime(last) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
