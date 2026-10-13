import { getStore } from "@/engine/store";

export function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(200, Number(url.searchParams.get("limit")) || 50);
  const selectedOnly = url.searchParams.get("selected") === "1";
  const events = getStore().events.filter((e) => !selectedOnly || e.selected);
  return Response.json({ total: events.length, events: events.slice(0, limit) });
}
