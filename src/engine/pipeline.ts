import { collectAll } from "./collect";
import { judge } from "./judge";
import { buildStore } from "./build";
import { llmConfigured } from "./llm";
import { readPersisted, writePersisted, type Backend } from "./persist";
import { SOURCES } from "./sources";
import type { Item } from "./types";

export interface PipelineReport {
  backend: Backend;
  scorer: "llm" | "heuristic";
  collected: number;
  fresh: number;
  judged: number;
  failures: string[];
  items: number;
  selected: number;
  events: number;
  editions: number;
}

const RETAIN_DAYS = 14;

/** 一次完整的流水线：采集 → 评分与写作 → 聚簇 → 共振 → 成刊 → 存储。命令行和 Vercel Cron 共用。 */
export async function runPipeline(opts: { maxNew?: number; concurrency?: number; log?: (msg: string) => void } = {}): Promise<PipelineReport> {
  const log = opts.log ?? (() => {});
  const maxNew = opts.maxNew ?? Number(process.env.PIPELINE_MAX_NEW ?? 40);
  const concurrency = opts.concurrency ?? 4;

  const previous: Item[] = (await readPersisted())?.items ?? [];
  const known = new Set(previous.map((i) => i.id));

  const { entries, failures } = await collectAll(SOURCES);
  const fresh = entries.filter((e) => !known.has(e.id)).slice(0, maxNew);
  log(`收到 ${entries.length} 条，新资料 ${fresh.length} 条，评分方式：${llmConfigured() ? "模型双评分" : "启发式"}`);

  const bySource = new Map(SOURCES.map((s) => [s.id, s]));
  const judged: Item[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < fresh.length) {
        const entry = fresh[cursor++];
        try {
          judged.push(await judge(entry, bySource.get(entry.sourceId)!));
        } catch (err) {
          failures.push(`评分失败 ${entry.title}: ${(err as Error).message}`);
        }
      }
    }),
  );

  const cutoff = Date.now() - RETAIN_DAYS * 86400_000;
  const items = [...previous, ...judged].filter((i) => Date.parse(i.publishedAt) >= cutoff);
  const store = buildStore("live", SOURCES, items);
  const kind = await writePersisted(store);

  return {
    backend: kind,
    scorer: llmConfigured() ? "llm" : "heuristic",
    collected: entries.length,
    fresh: fresh.length,
    judged: judged.length,
    failures,
    items: store.items.length,
    selected: store.items.filter((i) => i.selected).length,
    events: store.events.length,
    editions: store.editions.length,
  };
}
