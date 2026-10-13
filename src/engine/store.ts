import type { Store } from "./types";
import { buildStore } from "./build";
import { seedItems } from "./seed";
import { readPersisted } from "./persist";
import { SOURCES } from "./sources";

const TTL = 60_000;
let cache: { at: number; store: Store } | null = null;

/** 公开读取层：页面、API、RSS 都从这里读。有采集结果读采集结果，否则用示范数据。 */
export async function getStore(): Promise<Store> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return cache.store;
  let store: Store | null = null;
  try {
    store = await readPersisted();
  } catch (err) {
    console.error("读取存储失败，回退到示范数据", err);
  }
  if (!store?.items.length) store = buildStore("demo", SOURCES, seedItems(SOURCES, now), now);
  cache = { at: now, store };
  return store;
}

export function sourceMap(store: Store) {
  return new Map(store.sources.map((s) => [s.id, s]));
}
