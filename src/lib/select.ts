import type { Item, Store, StoryEvent } from "@/engine/types";

/** 版面权重：份量为主，来源越多、共振越强越靠前。 */
export function weight(e: StoryEvent): number {
  return e.score + e.sourceIds.length * 6 + e.heat * 4;
}

export function frontPage(store: Store, now = Date.now()) {
  const recent = store.events.filter((e) => e.selected && now - Date.parse(e.lastSeenAt) < 24 * 3600_000);
  const ranked = [...recent].sort((a, b) => weight(b) - weight(a));
  const dayItems = store.items.filter((i) => now - Date.parse(i.publishedAt) < 24 * 3600_000);
  return {
    lead: ranked[0] ?? null,
    secondary: ranked.slice(1, 5),
    briefs: ranked.slice(5),
    stats: {
      collected: dayItems.length,
      selected: dayItems.filter((i) => i.selected).length,
      events: recent.length,
    },
  };
}

export function itemsOf(store: Store, e: StoryEvent): Item[] {
  const set = new Set(e.itemIds);
  return store.items.filter((i) => set.has(i.id));
}

/** 按中文阅读速度（约 400 字/分钟）估算读完版面要几分钟。 */
export function readingMinutes(events: StoryEvent[]): number {
  const chars = events.reduce((n, e) => n + e.title.length + e.digest.length + e.reason.length, 0);
  return Math.max(1, Math.round(chars / 400));
}
