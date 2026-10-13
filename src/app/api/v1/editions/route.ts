import { getStore } from "@/engine/store";

export function GET() {
  const editions = getStore().editions;
  return Response.json({ total: editions.length, editions: editions.map((e) => ({ date: e.date, no: e.no, lead: e.lead?.title ?? null, stats: e.stats })) });
}
