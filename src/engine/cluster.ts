import { CLUSTER } from "../../industry/selection";
import type { Item } from "./types";
import { hash, namedTokens, normTitle, plainTokens, storyTokens } from "./text";

/**
 * 把报道同一件事的资料聚成事件。示范数据带 eventKey 直接归组。
 * 真实资料只拿原标题比：先丢掉满篇都是的公司名，再看辨识词是不是同一句。
 * 跟事件的第一篇比，不跟后来的成员比，避免「都提到 Jensen」把后续进展粘成一团。
 */
function sameStory(
  a: Set<string>,
  b: Set<string>,
  common: Set<string>,
  freq: Map<string, number>,
  namesA: Set<string>,
  namesB: Set<string>,
  plainA: Set<string>,
  plainB: Set<string>,
): boolean {
  const left = [...a].filter((token) => !common.has(token));
  const right = new Set([...b].filter((token) => !common.has(token)));
  if (left.length < 2 || right.size < 2) return false;
  const shared = left.filter((token) => right.has(token));
  if (shared.length < 2) return false;
  const denom = Math.min(left.length, right.size);
  const longer = Math.max(left.length, right.size);
  // 较短标题至少三分之二对上，较长标题也得有四成是同一批词。短标题就不会把无关长文吸进去。
  if (shared.length >= 3 && shared.length * 3 >= denom * 2 && shared.length * 5 >= longer * 2) return true;
  // 只有两个辨识词时，两句都得几乎一样长，避免「ChatGPT Sales」吸进一篇更长的销售稿。
  if (shared.length === 2 && longer <= 3 && shared.length * 5 >= denom * 4) return true;
  // 冷门专名再加一个支撑词。支撑词要么比较常见，要么在标题里是小写（memories），避免把人名的另一半算进去。
  const named = shared.filter((token) => token.length >= 4 && namesA.has(token) && namesB.has(token) && (freq.get(token) ?? 1) <= CLUSTER.anchorMaxCount);
  const support = shared.some((token) => {
    if (named.includes(token) || token.length < 5) return false;
    return (freq.get(token) ?? 1) >= 3 || plainA.has(token) || plainB.has(token);
  });
  return named.length > 0 && support;
}

export function cluster(items: Item[]): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  const freq = new Map<string, number>();
  const rows = items.map((item) => {
    const headline = item.originalTitle.trim() || item.title;
    const tokens = storyTokens(headline);
    for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
    return { item, tokens, names: namedTokens(headline), plain: plainTokens(headline), headline: normTitle(headline), ts: Date.parse(item.publishedAt) || 0 };
  });
  const cut = Math.max(8, Math.ceil(rows.length * CLUSTER.commonRate));
  const common = new Set([...freq].filter(([, count]) => count > cut).map(([token]) => token));
  const leads = new Map<string, { tokens: Set<string>; names: Set<string>; plain: Set<string>; headline: string; latest: number }>();

  for (const row of [...rows].sort((a, b) => a.ts - b.ts)) {
    if (row.item.eventKey) {
      const id = `e-${row.item.eventKey}`;
      row.item.eventId = id;
      groups.set(id, [...(groups.get(id) ?? []), row.item]);
      continue;
    }
    let best: string | null = null;
    for (const [id, lead] of leads) {
      if (row.ts - lead.latest > CLUSTER.lookbackDays * 86400_000) continue;
      const same = (row.headline.length > 12 && row.headline === lead.headline) || sameStory(row.tokens, lead.tokens, common, freq, row.names, lead.names, row.plain, lead.plain);
      if (!same) continue;
      best = id;
      break;
    }
    const id = best ?? `e-${hash(row.item.id)}`;
    row.item.eventId = id;
    groups.set(id, [...(groups.get(id) ?? []), row.item]);
    const prev = leads.get(id);
    if (!prev) leads.set(id, { tokens: row.tokens, names: row.names, plain: row.plain, headline: row.headline, latest: row.ts });
    else if (row.ts > prev.latest) prev.latest = row.ts;
  }
  return groups;
}
