import { HEAT } from "../../industry/selection";
import type { EventStatus, Item, Source } from "./types";

/**
 * 事件的共振值：窗口内每个独立来源只算一次（取它最早的报道），
 * 按半衰期衰减，一手信源乘以系数。一家媒体发十篇也只算一次。
 */
export function resonance(items: Item[], sources: Map<string, Source>, at: number): number {
  const firstBySource = new Map<string, number>();
  for (const item of items) {
    const ts = new Date(item.publishedAt).getTime();
    if (ts > at || at - ts > HEAT.windowHours * 3600_000) continue;
    const prev = firstBySource.get(item.sourceId);
    if (prev === undefined || ts < prev) firstBySource.set(item.sourceId, ts);
  }
  let total = 0;
  for (const [sourceId, ts] of firstBySource) {
    const tier = sources.get(sourceId)?.tier ?? "T2";
    const ageH = (at - ts) / 3600_000;
    total += (HEAT.tierWeight[tier] ?? 1) * Math.pow(0.5, ageH / HEAT.halfLifeHours);
  }
  return Math.round(total * 100) / 100;
}

export function status(now: number, before: number, firstSeen: number, at: number): EventStatus {
  if (at - firstSeen < HEAT.compareHours * 3600_000) return "new";
  if (now >= before * 1.25 && now - before >= 0.4) return "rising";
  if (now < before * 0.7) return "cooling";
  return "steady";
}
