"use client";

import { Bookmark } from "lucide-react";
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
        toast(toggle(clip) ? "已收藏" : "已取消收藏");
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full text-sm transition-colors",
        withLabel ? "border border-line px-3 hover:border-faint" : "w-8 justify-center hover:bg-raised",
        on ? "text-fg" : "text-dim hover:text-fg",
        className,
      )}
      aria-pressed={on}
      aria-label={on ? "取消收藏" : "收藏"}
    >
      <Bookmark className={cn("size-4", on && "fill-current")} strokeWidth={1.75} />
      {withLabel && <span>{on ? "已收藏" : "收藏"}</span>}
    </button>
  );
}
