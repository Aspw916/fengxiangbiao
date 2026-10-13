"use client";

import Link from "next/link";
import { SELECTION } from "../../industry/selection";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GRADE_LEGEND, scoreGrade } from "@/lib/score";

/** “评分 82 · 必读”，悬停或点按展开评分说明。official 决定按哪条入选线比较。 */
export function ScoreBadge({
  score,
  official,
  selected = true,
  compact = false,
  className,
}: {
  score: number;
  official: boolean;
  selected?: boolean;
  /** 列表里只显示数字和评语，竖排，少占一行。 */
  compact?: boolean;
  className?: string;
}) {
  const line = SELECTION.thresholds[official ? "T1" : "T2"];
  const grade = scoreGrade(score, selected);
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        className={cn(
          "cursor-help text-left underline decoration-dotted decoration-from-font underline-offset-4 outline-none hover:text-fg focus-visible:text-fg",
          compact && "no-underline",
          className,
        )}
        aria-label={`评分 ${score}，${grade}。查看评分说明`}
      >
        {compact ? (
          <span className="flex flex-col">
            <span className="font-mono text-base leading-none font-medium tabular-nums">{score}</span>
            <span className="mt-1.5 text-[10px] leading-none text-faint">{grade}</span>
          </span>
        ) : (
          <>评分 {score} · {grade}</>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 gap-3 rounded-2xl bg-surface p-4 text-fg ring-line">
        <p className="text-[13px] leading-relaxed">
          <span className="font-medium">评分</span>
          <span className="text-dim">衡量这件事本身对 AI 从业者有多值得花时间：分量多大、带来多少新东西、证据是否扎实、能不能马上用上。</span>
        </p>
        <ScoreScale score={score} line={line} />
        <p className="text-xs leading-relaxed text-dim">
          {official ? "一手信源" : "媒体报道"}达到 {line} 分进入星图。评分只看内容，不随时间变化；星星大小代表此刻有多少信源在报道。
        </p>
        <Link href="/method#score" className="text-xs text-dim underline-offset-4 hover:text-fg hover:underline">
          完整评分标准 →
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function ScoreScale({ score, line }: { score: number; line: number }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  return (
    <div aria-hidden>
      <div className="relative h-1.5 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-fg" style={{ width: pct(score) }} />
        <div className="absolute -top-1 -bottom-1 w-px bg-dim" style={{ left: pct(line) }} />
      </div>
      <div className="relative mt-1.5 h-4 font-mono text-[10px] text-faint tabular-nums">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(line) }}>
          入选 {line}
        </span>
        <span className="absolute right-0">100</span>
      </div>
      <p className="mt-1 text-[11px] text-faint">{GRADE_LEGEND}</p>
    </div>
  );
}
