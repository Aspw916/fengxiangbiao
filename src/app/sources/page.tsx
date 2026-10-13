import type { Metadata } from "next";
import { getStore } from "@/engine/store";
import { Kicker } from "@/components/story/marks";
import { relTime } from "@/lib/format";
import { SELECTION } from "../../../industry/selection";

export const metadata: Metadata = { title: "信源台" };

export default function SourcesPage() {
  const store = getStore();
  const rows = store.sources
    .map((s) => {
      const items = store.items.filter((i) => i.sourceId === s.id);
      const picked = items.filter((i) => i.selected).length;
      return { s, total: items.length, picked, rate: items.length ? picked / items.length : 0, last: items[0]?.publishedAt };
    })
    .sort((a, b) => a.s.tier.localeCompare(b.s.tier) || b.picked - a.picked);

  return (
    <>
      <header className="mb-8">
        <Kicker>信源台</Kicker>
        <h1 className="mt-1 font-serif text-3xl font-black">本刊的 {store.sources.length} 条供稿线</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          信源分两级：一手信源（官方博客、研究机构）门槛 {SELECTION.thresholds.T1} 分；媒体与个人门槛 {SELECTION.thresholds.T2} 分。名单在
          <code className="mx-1 font-mono text-ink">industry/sources.json</code>，换行业时替换它即可。
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-t-2 border-ink text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs text-ink-soft">
              <th className="py-2 font-normal">信源</th>
              <th className="py-2 font-normal">分级</th>
              <th className="py-2 text-right font-normal">收稿</th>
              <th className="py-2 text-right font-normal">入选</th>
              <th className="w-40 py-2 pl-6 font-normal">入选率</th>
              <th className="py-2 text-right font-normal">最近来稿</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, total, picked, rate, last }) => (
              <tr key={s.id} className="border-b border-rule">
                <td className="py-3">
                  <a href={s.homepage} target="_blank" rel="noreferrer" className="font-serif font-bold hover:text-vermilion">{s.name}</a>
                  <span className="block font-mono text-[11px] text-ink-soft">{new URL(s.feedUrl).host}</span>
                </td>
                <td className="py-3">
                  <span className={s.tier === "T1" ? "text-verdigris" : "text-ink-soft"}>{s.tier === "T1" ? "一手" : "媒体"}</span>
                </td>
                <td className="py-3 text-right font-mono">{total}</td>
                <td className="py-3 text-right font-mono">{picked}</td>
                <td className="py-3 pl-6">
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-paper-deep">
                      <div className="h-full bg-ink" style={{ width: `${Math.round(rate * 100)}%` }} />
                    </div>
                    <span className="w-9 text-right font-mono text-xs">{Math.round(rate * 100)}%</span>
                  </div>
                </td>
                <td className="py-3 text-right text-xs text-ink-soft">{last ? relTime(last) : "暂无来稿"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
