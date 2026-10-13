"use client";

import Link from "next/link";
import { useRef } from "react";
import { Download, Scissors, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useClips, type Clip } from "@/lib/clips";
import { relTime } from "@/lib/format";

export function ClipsBoard() {
  const { clips, toggle, replace, ready } = useClips();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportClips = () => {
    const blob = new Blob([JSON.stringify(clips, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `风向标剪报-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importClips = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Clip[];
      if (!Array.isArray(parsed) || parsed.some((c) => typeof c.eventId !== "string" || typeof c.title !== "string")) throw new Error();
      const merged = [...parsed, ...clips].filter((c, i, arr) => arr.findIndex((x) => x.eventId === c.eventId) === i);
      replace(merged);
      toast(`导入完成，剪报夹里现在有 ${merged.length} 篇`);
    } catch {
      toast("这个文件不是风向标导出的剪报，没有导入");
    }
  };

  if (!ready) return <div className="skeleton-ink h-32 w-full rounded-sm" aria-busy="true" />;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportClips} disabled={!clips.length}>
          <Download /> 导出
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
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
        <div className="border-2 border-dashed border-rule py-16 text-center">
          <Scissors className="mx-auto size-8 text-ink-soft" strokeWidth={1.4} />
          <p className="mt-3 font-serif text-lg font-bold">剪报夹还是空的</p>
          <p className="mt-1 text-sm text-ink-soft">在头版或事件档案里点剪刀图标，就能把稿件剪下来留着慢慢看。</p>
          <Link href="/" className="mt-4 inline-block border-b-2 border-vermilion pb-0.5 font-serif text-sm hover:text-vermilion">
            去头版找找
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => (
            <li key={c.eventId} className="relative border border-ink bg-card p-4 [clip-path:polygon(0_0,96%_0,100%_4%,100%_100%,0_100%)]">
              <button
                onClick={() => (toggle(c), toast("已从剪报夹移除"))}
                className="absolute top-2 right-3 text-ink-soft hover:text-vermilion"
                aria-label="移除这篇剪报"
              >
                <X className="size-4" />
              </button>
              <p className="font-mono text-[10px] text-ink-soft">剪于 {relTime(c.clippedAt)}</p>
              <Link href={`/event/${c.eventId}`} data-nav className="mt-1 block pr-4 font-serif font-bold leading-snug hover:text-vermilion">
                {c.title}
              </Link>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-ink-soft">{c.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
