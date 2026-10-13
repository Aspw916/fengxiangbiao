import { RefreshRejected, runLocked } from "@/engine/refresh";

export const maxDuration = 300;

/** Vercel Cron 每次调用都带 Authorization: Bearer $CRON_SECRET；本地开发没设 CRON_SECRET 时放行。 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!secret && process.env.VERCEL) {
    return Response.json({ error: "线上环境必须设置 CRON_SECRET" }, { status: 500 });
  }
  try {
    const report = await runLocked({ manual: false });
    return Response.json({ ok: true, ...report });
  } catch (err) {
    if (err instanceof RefreshRejected) return Response.json({ ok: false, error: err.message, ...err.status }, { status: 409 });
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
