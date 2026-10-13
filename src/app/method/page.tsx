import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/engine/store";
import { PageHeader } from "@/components/story/marks";
import { GRADE_LEGEND } from "@/lib/score";
import { HEAT, SELECTION } from "../../../industry/selection";

export const metadata: Metadata = { title: "方法" };

export default async function MethodPage() {
  const store = await getStore();
  const selected = store.items.filter((i) => i.selected).length;
  const steps = [
    { n: store.sources.length, unit: "信源", title: "采集", body: "按名单抓取 RSS。发布时间不可信或超过 72 小时的旧文不收。" },
    { n: store.items.length, unit: "资料", title: "评分", body: "按分量、增量、可信、可用打一个 0–100 的分。未配置模型时用启发式评分。" },
    { n: selected, unit: "入选", title: "过线", body: `一手信源 ${SELECTION.thresholds.T1} 分、媒体与个人 ${SELECTION.thresholds.T2} 分。` },
    { n: store.events.length, unit: "事件", title: "聚合", body: "不同来源报道的同一件事合并成一个事件，后续进展挂在同一处。" },
    { n: store.editions.length, unit: "日报", title: "成刊", body: `按分量与共振排序；共振每个来源只算一次，${HEAT.halfLifeHours} 小时减半。` },
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="方法" title="少一点信息，多一点判断">
        每篇资料都要经过五步，走到最后的才会在星场里发光。全部规则写在 <code className="font-mono text-fg">industry/</code> 目录里，改规则不用改代码。
      </PageHeader>

      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[1fr_auto] items-start gap-6 rounded-2xl border border-line p-5">
            <div>
              <p className="font-mono text-xs text-faint">0{i + 1}</p>
              <h2 className="mt-1 text-base font-medium">{s.title}</h2>
              <p className="mt-1 text-sm leading-6 text-dim">{s.body}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl tabular-nums">{s.n}</p>
              <p className="text-xs text-faint">{s.unit}</p>
            </div>
          </li>
        ))}
      </ol>

      <section id="score" className="mt-12 scroll-mt-24 text-sm leading-7 text-dim">
        <h2 className="text-sm font-medium text-fg">评分是什么</h2>
        <p className="mt-3">
          评分衡量这件事本身对 AI 从业者有多值得花时间，从 0 到 100。它综合四件事：分量有多大、带来了多少新事实、材料里的证据是否撑得住、读者能不能马上用上。公司名气和术语密度不加分。
        </p>
        <p className="mt-3 font-mono text-xs text-faint">{GRADE_LEGEND}</p>
        <p className="mt-3">
          一手信源达到 {SELECTION.thresholds.T1} 分、媒体报道达到 {SELECTION.thresholds.T2} 分，才会出现在星图里。评分只看内容，不随时间变化。星星的大小是另一回事：它表示此刻有多少信源在报道，报道越久贡献越小。
        </p>
      </section>

      <section className="mt-12 text-sm leading-7 text-dim">
        <h2 className="text-sm font-medium text-fg">几条原则</h2>
        <ul className="mt-3 space-y-1.5">
          <li>· 打开页面不调用模型，只读已经算好的结果。</li>
          <li>· 每条内容都链接原文，摘要不写原文没有的事实。</li>
          <li>· 收藏只保存在你的浏览器里。</li>
        </ul>
        <p className="mt-6">
          机器读者可以从 <Link href="/api/v1" className="text-fg underline underline-offset-4">API</Link> 或{" "}
          <Link href="/feed.xml" className="text-fg underline underline-offset-4">RSS</Link> 开始。
        </p>
      </section>
    </div>
  );
}
