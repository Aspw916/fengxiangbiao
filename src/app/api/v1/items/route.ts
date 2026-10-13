import { getStore } from "@/engine/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(500, Number(url.searchParams.get("limit")) || 100);
  const min = Number(url.searchParams.get("min")) || 0;
  const category = url.searchParams.get("category");
  const items = (await getStore()).items.filter((i) => i.score >= min && (!category || i.category === category));
  return Response.json({ total: items.length, items: items.slice(0, limit).map((i) => ({ ...i, eventKey: undefined })) });
}
