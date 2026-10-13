"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">页面加载失败</h1>
      <p className="mt-3 text-sm leading-6 text-dim">读取数据时出了问题。可以重试；如果持续失败，请检查存储配置（BLOB_READ_WRITE_TOKEN）是否正确。</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-faint">{error.digest}</p>}
      <Button className="mt-6 rounded-full" onClick={reset}>
        重试
      </Button>
    </div>
  );
}
