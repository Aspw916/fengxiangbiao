"use client";

import { useSyncExternalStore } from "react";

const KEY = "fxb:last-visit";
const IDS_KEY = "fxb:last-sky";

export type LastSky = { at: number; ids: string[] | null };

let snapshot: LastSky | null | undefined;
let pendingIds: string[] = [];

function read(): LastSky | null {
  if (snapshot === undefined) {
    const at = Number(window.localStorage.getItem(KEY));
    if (!Number.isFinite(at) || at <= 0) snapshot = null;
    else {
      const raw = window.localStorage.getItem(IDS_KEY);
      let ids: string[] | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) ids = parsed;
        } catch {
          ids = null;
        }
      }
      snapshot = { at, ids };
    }
  }
  return snapshot;
}

/** 离开前记下当前天空里的事件 id。坐标不存，下次按 id 对齐。 */
export function stageSkyIds(ids: string[]) {
  pendingIds = ids;
}

function save() {
  window.localStorage.setItem(KEY, String(Date.now()));
  if (pendingIds.length) window.localStorage.setItem(IDS_KEY, JSON.stringify(pendingIds));
}

function subscribe() {
  const onHide = () => document.visibilityState === "hidden" && save();
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", onHide);
  return () => {
    window.removeEventListener("pagehide", save);
    document.removeEventListener("visibilitychange", onHide);
  };
}

/** 上次离开时的天空。首次访问为 null，此时不要画出双曝光。 */
export function useLastSky(): LastSky | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
