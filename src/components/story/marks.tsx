import type { EventStatus, Source } from "@/engine/types";
import { cn } from "@/lib/utils";

/** 共振圆点：一个圆点 = 一个独立来源。实心铜绿 = 一手信源，空心 = 媒体与个人。 */
export function ResonanceDots({ sourceIds, sources, size = "sm" }: { sourceIds: string[]; sources: Map<string, Source>; size?: "sm" | "md" }) {
  const sorted = [...sourceIds].sort((a, b) => (sources.get(a)?.tier ?? "T2").localeCompare(sources.get(b)?.tier ?? "T2"));
  const label = sorted.map((id) => sources.get(id)?.name ?? id).join("、");
  return (
    <span className="inline-flex items-center gap-1" title={label} aria-label={`${sourceIds.length} 个来源：${label}`}>
      {sorted.map((id) => (
        <span
          key={id}
          className={cn(
            "inline-block rounded-full border",
            size === "md" ? "size-3" : "size-2",
            sources.get(id)?.tier === "T1" ? "border-verdigris bg-verdigris" : "border-ink-soft bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

const STATUS: Record<EventStatus, { text: string; cls: string } | null> = {
  new: { text: "新起", cls: "bg-vermilion text-paper" },
  rising: { text: "攀升", cls: "border border-vermilion text-vermilion" },
  cooling: { text: "回落", cls: "border border-rule text-ink-soft" },
  steady: null,
};

export function StatusMark({ status }: { status: EventStatus }) {
  const s = STATUS[status];
  if (!s) return null;
  return <span className={cn("inline-block rounded-[2px] px-1.5 py-px font-mono text-[10px] leading-4 tracking-wider", s.cls)}>{s.text}</span>;
}

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[11px] tracking-[0.2em] text-vermilion uppercase", className)}>{children}</span>;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between border-b-2 border-ink pb-1.5">
      <h2 className="font-serif text-lg font-bold tracking-wider">{children}</h2>
      {aside && <span className="text-xs text-ink-soft">{aside}</span>}
    </div>
  );
}
