import { getStore } from "@/engine/store";

export function GET() {
  return Response.json({ sources: getStore().sources });
}
