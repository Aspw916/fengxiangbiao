import { getStore } from "@/engine/store";
import { SITE } from "../../../../industry/taxonomy";

export function GET() {
  const store = getStore();
  return Response.json({
    name: `${SITE.name} · ${SITE.enName}`,
    mode: store.mode,
    generatedAt: store.generatedAt,
    endpoints: {
      "/api/v1/events": "事件列表，按共振值排序。参数：selected=1 只看入选，limit=数量",
      "/api/v1/events/{id}": "单个事件及其全部报道",
      "/api/v1/items": "资料列表。参数：category=栏目 key，min=最低平均分，limit=数量",
      "/api/v1/editions": "晨报列表；/api/v1/editions/latest 取最新一期",
      "/api/v1/sources": "信源名单",
      "/feed.xml": "入选事件 RSS",
    },
  });
}
