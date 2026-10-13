import type { EventStatus, Source } from "@/engine/types";
import { cn } from "@/lib/utils";

/** 一个圆点 = 一个独立来源。实心 = 一手信源，空心 = 媒体与个人。 */
export function ResonanceDots({ sourceIds, sources, size = "sm" }: { sourceIds: string[]; sources: Map<string, Source>; size?: "sm" | "md" }) {
  const sorted = [...sourceIds].sort((a, b) => (sources.get(a)?.tier ?? "T2").localeCompare(sources.get(b)?.tier ?? "T2"));
  const label = sorted.map((id) => sources.get(id)?.name ?? id).join("、");
  return (
    <span className="inline-flex items-center gap-1" title={label} aria-label={`${sourceIds.length} 个来源：${label}`}>
      {sorted.map((id) => (
        <span
          key={id}
          className={cn(
            "inline-block rounded-full",
            size === "md" ? "size-2.5" : "size-1.5",
            sources.get(id)?.tier === "T1" ? "bg-fg" : "border border-faint",
          )}
        />
      ))}
    </span>
  );
}

const STATUS: Record<EventStatus, { text: string; cls: string } | null> = {
  new: { text: "新", cls: "bg-fg text-bg" },
  rising: { text: "↑ 攀升", cls: "border border-line text-fg" },
  cooling: { text: "回落", cls: "text-faint" },
  steady: null,
};

export function StatusMark({ status }: { status: EventStatus }) {
  const s = STATUS[status];
  if (!s) return null;
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", s.cls)}>{s.text}</span>;
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-medium text-faint", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-[15px] leading-7 text-dim">{children}</div>}
    </header>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-medium text-dim">{children}</h2>
      {aside && <span className="text-xs text-faint">{aside}</span>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <p className="text-base font-medium">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-dim">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
