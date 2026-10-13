import { getStore } from "@/engine/store";
import { itemsOf } from "@/lib/select";

export async function GET(_req: Request, { params }: RouteContext<"/api/v1/events/[id]">) {
  const { id } = await params;
  const store = await getStore();
  const event = store.events.find((e) => e.id === id);
  if (!event) return Response.json({ error: "事件不存在" }, { status: 404 });
  return Response.json({ event, items: itemsOf(store, event) });
}
