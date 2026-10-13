import Parser from "rss-parser";
import type { Source } from "./types";
import { hash, stripHtml } from "./text";

export interface RawEntry {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt: string;
}

const parser = new Parser({ timeout: 15_000, headers: { "user-agent": "AISignalDaily/0.1 (+https://github.com)" } });

/** 抓一个信源，只保留窗口内、有可信发布时间的条目（旧文不刷屏）。 */
export async function collectSource(source: Source, maxAgeHours = 72): Promise<RawEntry[]> {
  const feed = await parser.parseURL(source.feedUrl);
  const cutoff = Date.now() - maxAgeHours * 3600_000;
  const out: RawEntry[] = [];
  for (const entry of feed.items ?? []) {
    const date = entry.isoDate ?? entry.pubDate;
    const url = entry.link;
    if (!date || !url || !entry.title) continue;
    const ts = new Date(date).getTime();
    if (Number.isNaN(ts) || ts < cutoff) continue;
    out.push({
      id: hash(url),
      sourceId: source.id,
      url,
      title: entry.title.trim(),
      snippet: stripHtml(entry.contentSnippet ?? entry.content ?? entry.summary ?? "").slice(0, 1200),
      publishedAt: new Date(ts).toISOString(),
    });
  }
  return out.slice(0, 12);
}

export async function collectAll(sources: Source[]): Promise<{ entries: RawEntry[]; failures: string[] }> {
  const results = await Promise.allSettled(sources.map((s) => collectSource(s)));
  const entries: RawEntry[] = [];
  const failures: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") entries.push(...r.value);
    else failures.push(`${sources[i].name}: ${(r.reason as Error).message}`);
  });
  const seen = new Set<string>();
  return { entries: entries.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))), failures };
}
