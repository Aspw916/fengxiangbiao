import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Store } from "./types";

// 存储适配：配置了 BLOB_READ_WRITE_TOKEN 时用 Vercel Blob（线上），否则用本地文件 data/store.json（本地开发）。
// Vercel 运行时文件系统只读，所以线上必须配 Blob；都没有时网站回退到示范数据。

const BLOB_PATH = process.env.STORE_BLOB_PATH ?? "fengxiangbiao/store.json";
const BLOB_ACCESS = (process.env.STORE_BLOB_ACCESS ?? "private") as "private" | "public";
export const LOCAL_PATH = join(process.cwd(), "data", "store.json");

export type Backend = "blob" | "file" | "none";

export function backend(): Backend {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (!process.env.VERCEL) return "file";
  return "none";
}

export async function readPersisted(): Promise<Store | null> {
  const kind = backend();
  if (kind === "blob") {
    const { get } = await import("@vercel/blob");
    const res = await get(BLOB_PATH, { access: BLOB_ACCESS, useCache: false }).catch(() => null);
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return JSON.parse(await new Response(res.stream).text()) as Store;
  }
  if (kind === "file" && existsSync(LOCAL_PATH)) return JSON.parse(readFileSync(LOCAL_PATH, "utf8")) as Store;
  return null;
}

export async function writePersisted(store: Store): Promise<Backend> {
  const kind = backend();
  const body = JSON.stringify(store);
  if (kind === "blob") {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, body, { access: BLOB_ACCESS, allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });
  } else if (kind === "file") {
    mkdirSync(dirname(LOCAL_PATH), { recursive: true });
    writeFileSync(LOCAL_PATH, body);
  } else {
    throw new Error("线上环境没有可写的存储：请在 Vercel 项目里连接 Blob 存储（会自动注入 BLOB_READ_WRITE_TOKEN）。");
  }
  return kind;
}
