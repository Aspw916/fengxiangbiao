import type { Metadata } from "next";
import { ClipsBoard } from "@/components/story/clips-board";
import { Kicker } from "@/components/story/marks";

export const metadata: Metadata = { title: "剪报夹" };

export default function ClipsPage() {
  return (
    <>
      <header className="mb-8">
        <Kicker>剪报夹</Kicker>
        <h1 className="mt-1 font-serif text-3xl font-black">你剪下来的稿件</h1>
        <p className="mt-2 text-sm text-ink-soft">只保存在这台设备的浏览器里，不会上传。可以导出成文件，换设备时再导入。</p>
      </header>
      <ClipsBoard />
    </>
  );
}
