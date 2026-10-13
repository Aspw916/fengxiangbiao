"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clock, relTime } from "@/lib/format";

type Status = { mode: "demo" | "live"; generatedAt: string | null; running: boolean; nextAllowedAt: number };
type Report = { judged: number; selected: number; events: number };

const POLL_MS = 8000;
const TOAST = { position: "top-center" as const };

async function fetchStatus(): Promise<Status | null> {
  const res = await fetch("/api/refresh", { cache: "no-store" }).catch(() => null);
  return res?.ok ? ((await res.json()) as Status) : null;
}

export function RefreshControl({ generatedAt, mode, now }: { generatedAt: string; mode: "demo" | "live"; now: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);

  const apply = useCallback((s: Status) => {
    setRunning(s.running);
    setNextAllowedAt(s.nextAllowedAt);
  }, []);

  useEffect(() => {
    fetchStatus().then((s) => s && apply(s));
  }, [apply, generatedAt]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      const s = await fetchStatus();
      if (!s) return;
      apply(s);
      if (!s.running) router.refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [running, apply, router]);

  const waitMin = Math.ceil((nextAllowedAt - now) / 60_000);
  const cooling = !running && waitMin > 0;

  const refresh = async () => {
    setRunning(true);
    const id = toast.loading("正在拉取最新资讯，通常需要一分钟左右…", TOAST);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const body = (await res.json()) as { ok: boolean; error?: string; report?: Report; status?: Status };
      if (body.status) {
        setRunning(body.status.running);
        setNextAllowedAt(body.status.nextAllowedAt);
      } else setRunning(false);
      if (body.ok && body.report) {
        const { judged, selected } = body.report;
        toast.success(judged ? `拉取完成：新增 ${judged} 条资料，当前入选 ${selected} 条` : "拉取完成：暂时没有新资讯", { ...TOAST, id });
        router.refresh();
      } else if (body.status?.running) {
        toast.message("已经有一次拉取在进行，完成后会自动更新", { ...TOAST, id });
      } else {
        toast.error(body.error ?? "拉取失败，请稍后再试", { ...TOAST, id });
      }
    } catch {
      setRunning(false);
      toast.error("网络异常，没能发起拉取", { ...TOAST, id });
    }
  };

  return (
    <p className="pointer-events-auto mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
      <span>
        {mode === "demo" ? "示范数据 · 尚未拉取" : `上次拉取 ${clock(generatedAt)}（${relTime(generatedAt, now)}）`}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={running || cooling}
        title={cooling ? `为控制成本，每 15 分钟最多手动拉取一次` : "立即从各信源拉取最新资讯"}
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-dim transition-colors",
          "hover:border-faint hover:text-fg disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        <RefreshCw className={cn("size-3", running && "animate-spin")} />
        {running ? "拉取中" : cooling ? `${waitMin} 分钟后可刷新` : "刷新"}
      </button>
    </p>
  );
}
