"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-vermilion">印刷事故</p>
      <h1 className="mt-3 font-serif text-3xl font-bold">这一版没能印出来</h1>
      <p className="mt-3 text-sm text-ink-soft">读取稿件时出了问题。可以重试一次；如果仍然失败，检查 data/store.json 是否完整，或运行 npm run pipeline -- --reset 回到示范数据。</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-soft">错误编号 {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        重新排版
      </Button>
    </div>
  );
}
