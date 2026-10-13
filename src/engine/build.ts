import { CATEGORIES } from "../../industry/taxonomy";
import { HEAT } from "../../industry/selection";
import type { Edition, EditionEntry, Item, Source, Store, StoryEvent } from "./types";
import { cluster } from "./cluster";
import { resonance, status } from "./heat";
import { dayKey } from "./text";

const FIRST_ISSUE = Date.UTC(2026, 0, 1);

function toEvents(items: Item[], sources: Source[], at: number): StoryEvent[] {
  const bySource = new Map(sources.map((s) => [s.id, s]));
  const events: StoryEvent[] = [];
  for (const [id, group] of cluster(items)) {
    const sorted = [...group].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const lead = [...group].sort((a, b) => Number(b.selected) - Number(a.selected) || b.score - a.score)[0];
    const firstSeen = new Date(sorted[0].publishedAt).getTime();
    const heat = resonance(group, bySource, at);
    const heatBefore = resonance(group, bySource, at - HEAT.compareHours * 3600_000);
    events.push({
      id,
      title: lead.title,
      digest: lead.summary,
      reason: lead.reason,
      category: lead.category,
      itemIds: sorted.map((i) => i.id),
      sourceIds: [...new Set(sorted.map((i) => i.sourceId))],
      firstSeenAt: sorted[0].publishedAt,
      lastSeenAt: sorted[sorted.length - 1].publishedAt,
      heat,
      heatBefore,
      status: status(heat, heatBefore, firstSeen, at),
      score: Math.max(...group.map((i) => i.score)),
      selected: group.some((i) => i.selected),
    });
  }
  return events;
}

function entry(e: StoryEvent): EditionEntry {
  return { eventId: e.id, title: e.title, summary: e.digest, sourceCount: e.sourceIds.length };
}

/** 成刊：按事件首次出现的日期分刊，一件事只上一期；头条取份量 × 来源数最高的一件。 */
function toEditions(events: StoryEvent[], items: Item[], sources: Source[]): Edition[] {
  const days = new Map<string, StoryEvent[]>();
  for (const e of events) if (e.selected) days.set(dayKey(e.firstSeenAt), [...(days.get(dayKey(e.firstSeenAt)) ?? []), e]);

  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => {
      const ranked = [...list].sort((a, b) => b.score * b.sourceIds.length - a.score * a.sourceIds.length);
      const [lead, ...rest] = ranked;
      const briefs = rest.filter((e) => e.sourceIds.length === 1 && e.score < 75);
      const main = rest.filter((e) => !briefs.includes(e));
      const sections = [...new Set(CATEGORIES.map((c) => c.section))]
        .map((title) => {
          const keys: string[] = CATEGORIES.filter((c) => c.section === title).map((c) => c.key);
          return { key: keys[0], title, entries: main.filter((e) => keys.includes(e.category)).map(entry) };
        })
        .filter((s) => s.entries.length);
      const dayItems = items.filter((i) => dayKey(i.publishedAt) === date);
      return {
        date,
        no: Math.floor((Date.parse(date) - FIRST_ISSUE) / 86400_000) + 1,
        lead: lead ? entry(lead) : null,
        sections,
        briefs: briefs.map(entry),
        stats: {
          collected: dayItems.length,
          selected: dayItems.filter((i) => i.selected).length,
          events: list.length,
          sources: new Set(dayItems.map((i) => i.sourceId)).size || sources.length,
        },
      };
    });
}

export function buildStore(mode: Store["mode"], sources: Source[], items: Item[], at = Date.now()): Store {
  const events = toEvents(items, sources, at).sort((a, b) => b.heat - a.heat || b.score - a.score);
  return {
    mode,
    generatedAt: new Date(at).toISOString(),
    sources,
    items: [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    events,
    editions: toEditions(events, items, sources),
  };
}
