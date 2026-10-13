import { RefreshRejected, refreshStatus, runLocked } from "@/engine/refresh";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** 当前数据的拉取状态：上次拉取时间、是否正在拉取、下次允许手动刷新的时间。 */
export async function GET() {
  return Response.json(await refreshStatus());
}

/** 手动刷新：公开可调用，但受运行锁和冷却时间限制。 */
export async function POST() {
  try {
    const report = await runLocked({ manual: true });
    return Response.json({ ok: true, report, status: await refreshStatus() });
  } catch (err) {
    if (err instanceof RefreshRejected) return Response.json({ ok: false, error: err.message, status: err.status }, { status: 429 });
    return Response.json({ ok: false, error: (err as Error).message, status: await refreshStatus() }, { status: 500 });
  }
}
