"use client";

import { Scissors } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClips, type Clip } from "@/lib/clips";

export function ClipButton({ clip, className, withLabel = false }: { clip: Omit<Clip, "clippedAt">; className?: string; withLabel?: boolean }) {
  const { has, toggle, ready } = useClips();
  const on = ready && has(clip.eventId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(clip);
        toast(added ? "已剪下，放进剪报夹" : "已从剪报夹移除");
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm p-1 text-xs transition-colors",
        on ? "text-vermilion" : "text-ink-soft hover:text-ink",
        className,
      )}
      aria-pressed={on}
      aria-label={on ? "从剪报夹移除" : "剪下这篇"}
      title={on ? "从剪报夹移除" : "剪下这篇"}
    >
      <Scissors className={cn("size-3.5", on && "fill-current")} />
      {withLabel && <span>{on ? "已剪下" : "剪下"}</span>}
    </button>
  );
}
