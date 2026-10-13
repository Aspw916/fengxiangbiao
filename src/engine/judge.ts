import { CATEGORIES, WEIGHT_TERMS } from "../../industry/taxonomy";
import { SELECTION } from "../../industry/selection";
import type { Item, Source } from "./types";
import type { RawEntry } from "./collect";
import { chatJson, llmConfigured, loadPrompt } from "./llm";
import { hash } from "./text";

/** 没有模型时的兜底评分：信源分级 + 份量词 + 正文长度，两次评分用不同扰动模拟独立判断。 */
function heuristicScore(entry: RawEntry, tier: string, pass: number): number {
  const text = `${entry.title} ${entry.snippet}`.toLowerCase();
  let s = tier === "T1" ? 60 : 58;
  for (const term of WEIGHT_TERMS) if (text.includes(term)) s += 5;
  s += Math.min(10, entry.snippet.length / 120);
  const jitter = (parseInt(hash(entry.id + pass), 36) % 11) - 5;
  return Math.max(0, Math.min(100, Math.round(s + jitter)));
}

function heuristicCategory(entry: RawEntry): string {
  const text = `${entry.title} ${entry.snippet}`.toLowerCase();
  let best = "industry";
  let hits = 0;
  for (const c of CATEGORIES) {
    const n = c.keywords.filter((k) => text.includes(k)).length;
    if (n > hits) [best, hits] = [c.key, n];
  }
  return best;
}

function material(entry: RawEntry): string {
  return `标题：${entry.title}\n正文：${entry.snippet || "（无正文）"}`;
}

export async function judge(entry: RawEntry, source: Source): Promise<Item> {
  let scores: [number, number];
  let title = entry.title;
  let summary = entry.snippet.slice(0, 160) || entry.title;
  let reason = "";
  let category = heuristicCategory(entry);

  if (llmConfigured()) {
    const scorePrompt = loadPrompt("score");
    const [a, b] = await Promise.all([0, 1].map(() => chatJson<{ score: number }>(scorePrompt, material(entry))));
    scores = [Math.round(a.score), Math.round(b.score)];
    const written = await chatJson<{ title: string; summary: string; reason: string; category: string }>(loadPrompt("write"), material(entry));
    title = written.title || title;
    summary = written.summary || summary;
    reason = written.reason || "";
    if (CATEGORIES.some((c) => c.key === written.category)) category = written.category;
  } else {
    scores = [heuristicScore(entry, source.tier, 0), heuristicScore(entry, source.tier, 1)];
  }

  const score = Math.round((scores[0] + scores[1]) / 2);
  return {
    id: entry.id,
    sourceId: entry.sourceId,
    url: entry.url,
    originalTitle: entry.title,
    title,
    summary,
    reason,
    category,
    publishedAt: entry.publishedAt,
    scores,
    score,
    selected: score >= (SELECTION.thresholds[source.tier] ?? 101),
    eventId: "",
  };
}
