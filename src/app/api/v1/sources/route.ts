import { getStore } from "@/engine/store";

export async function GET() {
  return Response.json({ sources: (await getStore()).sources });
}
