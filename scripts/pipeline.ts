// 流水线：采集 → 评分与写作 → 聚簇 → 共振 → 成刊，结果写入 data/store.json。
// 用法：npm run pipeline        （有 LLM_API_KEY 时用模型，否则用启发式评分）
//       npm run pipeline -- --reset   （删除 data/store.json，回到示范数据）
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { collectAll } from "../src/engine/collect";
import { judge } from "../src/engine/judge";
import { buildStore } from "../src/engine/build";
import { llmConfigured } from "../src/engine/llm";
import { SOURCES, STORE_PATH } from "../src/engine/store";
import type { Item, Store } from "../src/engine/types";

async function main() {
  if (process.argv.includes("--reset")) {
    rmSync(STORE_PATH, { force: true });
    console.log("已删除 data/store.json，网站回到示范数据。");
    return;
  }

  const previous: Item[] = existsSync(STORE_PATH) ? (JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store).items : [];
  const known = new Map(previous.map((i) => [i.id, i]));

  console.log(`采集 ${SOURCES.length} 个信源…`);
  const { entries, failures } = await collectAll(SOURCES);
  for (const f of failures) console.warn(`  跳过 ${f}`);
  const fresh = entries.filter((e) => !known.has(e.id));
  console.log(`收到 ${entries.length} 条，其中新资料 ${fresh.length} 条。评分方式：${llmConfigured() ? "模型双评分" : "启发式（未配置 LLM_API_KEY）"}`);

  const bySource = new Map(SOURCES.map((s) => [s.id, s]));
  const judged: Item[] = [];
  for (const [i, entry] of fresh.entries()) {
    try {
      judged.push(await judge(entry, bySource.get(entry.sourceId)!));
      process.stdout.write(`\r  已处理 ${i + 1}/${fresh.length}`);
    } catch (err) {
      console.warn(`\n  评分失败 ${entry.title}: ${(err as Error).message}`);
    }
  }
  if (fresh.length) process.stdout.write("\n");

  const cutoff = Date.now() - 14 * 86400_000;
  const items = [...previous, ...judged].filter((i) => Date.parse(i.publishedAt) >= cutoff);
  const store = buildStore("live", SOURCES, items);
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  console.log(`完成：${store.items.length} 条资料，${store.items.filter((i) => i.selected).length} 条信号，${store.events.length} 个事件，${store.editions.length} 期晨报。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
