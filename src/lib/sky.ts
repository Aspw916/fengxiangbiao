import type { Store, StoryEvent } from "@/engine/types";
import { CATEGORIES, categoryLabel } from "../../industry/taxonomy";
import { HEAT } from "../../industry/selection";

export interface SkyReport {
  t: number;
  tier: "T1" | "T2";
  source: string;
  title: string;
  url: string;
  score: number;
}

/** 星场与聚焦共用的事件快照，随首屏 HTML 一次下发给客户端。 */
export interface SkyEvent {
  id: string;
  title: string;
  digest: string;
  reason: string;
  category: string;
  categoryLabel: string;
  band: number;
  score: number;
  selected: boolean;
  status: StoryEvent["status"];
  sourceCount: number;
  first: number;
  reports: SkyReport[];
}

export const HEAT_PARAMS = { windowH: HEAT.windowHours, halfLifeH: HEAT.halfLifeHours, t1: HEAT.tierWeight.T1 ?? 1 };
export const BANDS = CATEGORIES.map((c) => ({ key: c.key, label: c.label }));

export function toSkyEvent(store: Store, e: StoryEvent): SkyEvent {
  const sources = new Map(store.sources.map((s) => [s.id, s]));
  const ids = new Set(e.itemIds);
  const reports = store.items
    .filter((i) => ids.has(i.id))
    .map((i) => ({
      t: Date.parse(i.publishedAt),
      tier: sources.get(i.sourceId)?.tier ?? "T2",
      source: sources.get(i.sourceId)?.name ?? i.sourceId,
      title: i.title,
      url: i.url,
      score: i.score,
    }))
    .sort((a, b) => a.t - b.t);
  const band = Math.max(0, CATEGORIES.findIndex((c) => c.key === e.category));
  return {
    id: e.id,
    title: e.title,
    digest: e.digest,
    reason: e.reason,
    category: e.category,
    categoryLabel: categoryLabel(e.category),
    band,
    score: e.score,
    selected: e.selected,
    status: e.status,
    sourceCount: e.sourceIds.length,
    first: reports[0]?.t ?? Date.parse(e.firstSeenAt),
    reports,
  };
}

/** 与引擎 heat.ts 相同的公式：窗口内每个来源只算最早一次，按半衰期衰减。 */
export function heatAt(e: SkyEvent, t: number): number {
  const first = new Map<string, SkyReport>();
  for (const r of e.reports) {
    if (r.t > t || t - r.t > HEAT_PARAMS.windowH * 3600_000) continue;
    if (!first.has(r.source)) first.set(r.source, r);
  }
  let total = 0;
  for (const r of first.values()) total += (r.tier === "T1" ? HEAT_PARAMS.t1 : 1) * Math.pow(0.5, (t - r.t) / 3600_000 / HEAT_PARAMS.halfLifeH);
  return total;
}

export function matches(e: SkyEvent, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${e.title} ${e.digest} ${e.categoryLabel} ${e.reports.map((r) => r.source).join(" ")}`.toLowerCase();
  return needle.split(/\s+/).every((w) => hay.includes(w));
}
