import { RefreshRejected, runLocked } from "@/engine/refresh";

export const maxDuration = 300;

/** 定时拉取。线上必须带 Authorization: Bearer $CRON_SECRET；只有本地 next dev 在未设置密钥时放行。 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const hosted = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  if (!secret) {
    if (hosted) return Response.json({ error: "线上环境必须设置 CRON_SECRET" }, { status: 500 });
  } else if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runLocked({ manual: false });
    return Response.json({ ok: true, ...report });
  } catch (err) {
    if (err instanceof RefreshRejected) return Response.json({ ok: false, error: err.message, ...err.status }, { status: 409 });
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
