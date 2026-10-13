"use client";

import Link from "next/link";
import { useRef } from "react";
import { Download, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/story/marks";
import { useClips, type Clip } from "@/lib/clips";
import { relTime } from "@/lib/format";

export function ClipsBoard() {
  const { clips, toggle, replace, ready } = useClips();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportClips = () => {
    const blob = new Blob([JSON.stringify(clips, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `风向标收藏-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importClips = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Clip[];
      if (!Array.isArray(parsed) || parsed.some((c) => typeof c.eventId !== "string" || typeof c.title !== "string")) throw new Error();
      const merged = [...parsed, ...clips].filter((c, i, arr) => arr.findIndex((x) => x.eventId === c.eventId) === i);
      replace(merged);
      toast(`导入完成，共 ${merged.length} 条收藏`);
    } catch {
      toast("文件格式不对，没有导入");
    }
  };

  if (!ready) return <div className="skeleton h-32 w-full rounded-2xl" aria-busy="true" />;

  return (
    <>
      <div className="mb-6 flex gap-2">
        <Button variant="outline" size="sm" className="rounded-full" onClick={exportClips} disabled={!clips.length}>
          <Download /> 导出
        </Button>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => fileRef.current?.click()}>
          <Upload /> 导入
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importClips(f);
            e.target.value = "";
          }}
        />
      </div>

      {clips.length === 0 ? (
        <EmptyState title="还没有收藏" action={<Link href="/" className="text-sm text-fg underline underline-offset-4">回到今日</Link>}>
          在事件上点书签图标，就能把它留下来慢慢看。
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {clips.map((c) => (
            <li key={c.eventId} className="group relative rounded-2xl border border-line p-5 transition-colors hover:border-faint">
              <button
                onClick={() => (toggle(c), toast("已取消收藏"))}
                className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-faint hover:bg-raised hover:text-fg"
                aria-label="取消收藏"
              >
                <X className="size-4" />
              </button>
              <p className="text-xs text-faint">收藏于 {relTime(c.clippedAt)}</p>
              <Link href={`/event/${c.eventId}`} data-nav className="mt-1.5 block pr-6 text-[15px] leading-snug font-medium hover:opacity-80">
                {c.title}
              </Link>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-dim">{c.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
