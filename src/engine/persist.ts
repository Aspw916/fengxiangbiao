import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Store } from "./types";

// 存储适配：配置了 BLOB_READ_WRITE_TOKEN 时用 Vercel Blob（线上），否则用本地文件 data/store.json（本地开发）。
// Vercel 运行时文件系统只读，所以线上必须配 Blob；都没有时网站回退到示范数据。

const BLOB_PATH = process.env.STORE_BLOB_PATH ?? "fengxiangbiao/store.json";
const BLOB_LOCK_PATH = BLOB_PATH.replace(/[^/]+$/, "lock.json");
const BLOB_ACCESS = (process.env.STORE_BLOB_ACCESS ?? "private") as "private" | "public";
export const LOCAL_PATH = join(process.cwd(), "data", "store.json");
const LOCAL_LOCK_PATH = join(process.cwd(), "data", "lock.json");

export type Backend = "blob" | "file" | "none";

export function backend(): Backend {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (!process.env.VERCEL) return "file";
  return "none";
}

async function readJson<T>(blobPath: string, localPath: string): Promise<T | null> {
  const kind = backend();
  if (kind === "blob") {
    const { get } = await import("@vercel/blob");
    const res = await get(blobPath, { access: BLOB_ACCESS, useCache: false }).catch(() => null);
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return JSON.parse(await new Response(res.stream).text()) as T;
  }
  if (kind === "file" && existsSync(localPath)) return JSON.parse(readFileSync(localPath, "utf8")) as T;
  return null;
}

async function writeJson(blobPath: string, localPath: string, value: unknown): Promise<Backend> {
  const kind = backend();
  const body = JSON.stringify(value);
  if (kind === "blob") {
    const { put } = await import("@vercel/blob");
    await put(blobPath, body, { access: BLOB_ACCESS, allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });
  } else if (kind === "file") {
    mkdirSync(dirname(localPath), { recursive: true });
    writeFileSync(localPath, body);
  } else {
    throw new Error("线上环境没有可写的存储：请在 Vercel 项目里连接 Blob 存储（会自动注入 BLOB_READ_WRITE_TOKEN）。");
  }
  return kind;
}

export function readPersisted(): Promise<Store | null> {
  return readJson<Store>(BLOB_PATH, LOCAL_PATH);
}

export function writePersisted(store: Store): Promise<Backend> {
  return writeJson(BLOB_PATH, LOCAL_PATH, store);
}

/** 流水线运行锁：记录开始时间，防止手动刷新和定时任务同时跑。 */
export async function readLock(): Promise<number | null> {
  return (await readJson<{ startedAt: number }>(BLOB_LOCK_PATH, LOCAL_LOCK_PATH).catch(() => null))?.startedAt ?? null;
}

export async function writeLock(startedAt: number | null): Promise<void> {
  if (startedAt !== null) {
    await writeJson(BLOB_LOCK_PATH, LOCAL_LOCK_PATH, { startedAt });
    return;
  }
  const kind = backend();
  if (kind === "blob") {
    const { del } = await import("@vercel/blob");
    await del(BLOB_LOCK_PATH).catch(() => {});
  } else if (kind === "file") {
    rmSync(LOCAL_LOCK_PATH, { force: true });
  }
}
