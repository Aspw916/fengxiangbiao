import { getStore } from "@/engine/store";

export async function GET() {
  const editions = (await getStore()).editions;
  return Response.json({ total: editions.length, editions: editions.map((e) => ({ date: e.date, no: e.no, lead: e.lead?.title ?? null, stats: e.stats })) });
}
