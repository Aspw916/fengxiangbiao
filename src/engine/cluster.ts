import { CLUSTER } from "../../industry/selection";
import type { Item } from "./types";
import { hash, jaccard, tokens } from "./text";

/**
 * 把报道同一件事的资料聚成事件。示范数据带 eventKey 直接归组；
 * 真实资料用标题词元相似度，在 lookbackDays 内找最像的已有事件，不够像就新开一个。
 */
export function cluster(items: Item[]): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  const sigs = new Map<string, { tokens: Set<string>; latest: number }>();
  const sorted = [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

  for (const item of sorted) {
    if (item.eventKey) {
      const id = `e-${item.eventKey}`;
      item.eventId = id;
      groups.set(id, [...(groups.get(id) ?? []), item]);
      continue;
    }
    const t = tokens(`${item.originalTitle} ${item.title}`);
    const ts = new Date(item.publishedAt).getTime();
    let best: string | null = null;
    let bestSim = 0;
    for (const [id, sig] of sigs) {
      if (ts - sig.latest > CLUSTER.lookbackDays * 86400_000) continue;
      const sim = jaccard(t, sig.tokens);
      if (sim > bestSim) [best, bestSim] = [id, sim];
    }
    const id = best && bestSim >= CLUSTER.similarity ? best : `e-${hash(item.id)}`;
    item.eventId = id;
    groups.set(id, [...(groups.get(id) ?? []), item]);
    const prev = sigs.get(id);
    sigs.set(id, { tokens: prev ? new Set([...prev.tokens, ...t]) : t, latest: ts });
  }
  return groups;
}
