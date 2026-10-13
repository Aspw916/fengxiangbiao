import { runPipeline, type PipelineReport } from "./pipeline";
import { readLock, readPersisted, writeLock } from "./persist";
import { invalidateStore } from "./store";

/** 手动刷新的最短间隔，避免公开按钮被反复点击而产生模型费用。 */
export const COOLDOWN_MS = 15 * 60_000;
/** 锁超过这个时长视为上次运行异常中断，允许重新开始。 */
const LOCK_TTL_MS = 6 * 60_000;

export interface RefreshStatus {
  mode: "demo" | "live";
  generatedAt: string | null;
  running: boolean;
  nextAllowedAt: number;
}

export async function refreshStatus(now = Date.now()): Promise<RefreshStatus> {
  const [store, lock] = await Promise.all([readPersisted().catch(() => null), readLock()]);
  const generatedAt = store?.items.length ? store.generatedAt : null;
  const running = lock !== null && now - lock < LOCK_TTL_MS;
  const nextAllowedAt = generatedAt ? Date.parse(generatedAt) + COOLDOWN_MS : 0;
  return { mode: generatedAt ? "live" : "demo", generatedAt, running, nextAllowedAt };
}

export class RefreshRejected extends Error {
  constructor(
    message: string,
    readonly status: RefreshStatus,
  ) {
    super(message);
  }
}

/** 加锁运行一次流水线。manual 为 true 时还要检查冷却时间。 */
export async function runLocked({ manual }: { manual: boolean }): Promise<PipelineReport> {
  const now = Date.now();
  const status = await refreshStatus(now);
  if (status.running) throw new RefreshRejected("正在拉取中，请稍候", status);
  if (manual && now < status.nextAllowedAt) throw new RefreshRejected("刚刚拉取过，稍后再试", status);
  await writeLock(now);
  try {
    return await runPipeline();
  } finally {
    await writeLock(null);
    invalidateStore();
  }
}
