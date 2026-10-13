import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/engine/store";
import { Kicker } from "@/components/story/marks";
import { HEAT, SELECTION } from "../../../industry/selection";

export const metadata: Metadata = { title: "编辑部手记" };

export default function MethodPage() {
  const store = getStore();
  const selected = store.items.filter((i) => i.selected).length;
  const steps = [
    { n: store.sources.length, unit: "条供稿线", title: "收稿", body: "按信源名单抓取 RSS。发布时间不可信、或超过 72 小时的旧文不进站，避免刷屏。" },
    { n: store.items.length, unit: "篇资料", title: "双人审稿", body: "同一套评分口径独立打两次分，取平均，降低一次判断的偶然性。没有配置模型时，用启发式评分器代替。" },
    { n: selected, unit: "篇入选", title: "过线", body: `一手信源 ${SELECTION.thresholds.T1} 分、媒体与个人 ${SELECTION.thresholds.T2} 分。官方原文门槛低一些，转述门槛高一些。` },
    { n: store.events.length, unit: "件事", title: "并稿", body: "不同来源报道的同一件事并成一个事件；后来的进展挂在同一份档案下。" },
    { n: store.editions.length, unit: "期晨报", title: "排版", body: `按份量和共振排出头版；共振值每个来源只算一次，${HEAT.halfLifeHours} 小时减半。每天成一期晨报。` },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-10 text-center">
        <Kicker>编辑部手记</Kicker>
        <h1 className="mt-2 font-serif text-4xl font-black text-balance">不是更多信息，而是把今天的 AI 排成一张版</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink-soft">
          风向标没有编辑部，只有一套公开的编辑规则。每一篇资料都要经过下面五道工序，走到最后的才会出现在头版。所有规则写在
          <code className="mx-1 font-mono text-ink">industry/</code>目录里，改规则不用改代码。
        </p>
      </header>

      <ol className="relative">
        {steps.map((s, i) => (
          <li key={s.title} className="relative grid grid-cols-[5rem_1fr] gap-6 pb-10 sm:grid-cols-[8rem_1fr]">
            <div className="text-right">
              <span className="block font-mono text-3xl font-medium" style={{ opacity: 1 - i * 0.12 }}>{s.n}</span>
              <span className="text-xs text-ink-soft">{s.unit}</span>
            </div>
            <div className="border-l-2 border-ink pl-6">
              <h2 className="font-serif text-xl font-bold">
                <span className="mr-2 font-mono text-sm text-vermilion">0{i + 1}</span>
                {s.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-soft">{s.body}</p>
              <div className="mt-3 h-1.5 bg-ink" style={{ width: `${100 - i * 18}%` }} aria-hidden />
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-6 border-t-[3px] border-double border-ink pt-6 text-sm leading-7">
        <h2 className="font-serif text-lg font-bold">三条不变的规矩</h2>
        <ul className="mt-3 list-inside list-decimal space-y-1 text-ink-soft">
          <li>读者打开页面时不调用模型，只读已经排好的版面。</li>
          <li>每一篇稿件都链接原文，摘要不写原文没有的事实。</li>
          <li>剪报和阅读偏好只存在你的浏览器里。</li>
        </ul>
        <p className="mt-6">
          想把风向标改成你所在行业的版本？换掉信源、分类和评分口径即可，见项目 README。机器读者可以从
          <Link href="/api/v1" className="mx-1 border-b border-ink hover:text-vermilion">开放接口</Link>
          或
          <Link href="/feed.xml" className="mx-1 border-b border-ink hover:text-vermilion">RSS</Link>
          开始。
        </p>
      </section>
    </div>
  );
}
