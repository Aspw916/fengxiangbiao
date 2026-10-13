import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sourcesFile from "../../industry/sources.json";
import type { Source, Store } from "./types";
import { buildStore } from "./build";
import { seedItems } from "./seed";

export const STORE_PATH = join(process.cwd(), "data", "store.json");
export const SOURCES = sourcesFile.sources as Source[];

let cache: { mtime: number; store: Store } | null = null;
let demo: { at: number; store: Store } | null = null;

/** 公开读取层：页面、API、RSS 都从这里读。有采集结果读采集结果，否则用示范数据。 */
export function getStore(): Store {
  if (existsSync(STORE_PATH)) {
    const mtime = statSync(STORE_PATH).mtimeMs;
    if (!cache || cache.mtime !== mtime) cache = { mtime, store: JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store };
    if (cache.store.items.length) return cache.store;
  }
  const now = Date.now();
  if (!demo || now - demo.at > 5 * 60_000) demo = { at: now, store: buildStore("demo", SOURCES, seedItems(SOURCES, now), now) };
  return demo.store;
}

export function sourceMap(store: Store) {
  return new Map(store.sources.map((s) => [s.id, s]));
}
