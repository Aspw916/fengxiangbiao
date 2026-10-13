import type { Metadata } from "next";
import { ClipsBoard } from "@/components/story/clips-board";
import { PageHeader } from "@/components/story/marks";

export const metadata: Metadata = { title: "收藏" };

export default function ClipsPage() {
  return (
    <>
      <PageHeader eyebrow="收藏" title="你保存的事件">
        只保存在这台设备的浏览器里，不会上传。可以导出为文件，换设备时再导入。
      </PageHeader>
      <ClipsBoard />
    </>
  );
}
