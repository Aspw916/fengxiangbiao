import { getStore } from "@/engine/store";

export async function GET(_req: Request, { params }: RouteContext<"/api/v1/editions/[date]">) {
  const { date } = await params;
  const editions = (await getStore()).editions;
  const edition = date === "latest" ? editions[0] : editions.find((e) => e.date === date);
  if (!edition) return Response.json({ error: "这一期不存在" }, { status: 404 });
  return Response.json(edition);
}
