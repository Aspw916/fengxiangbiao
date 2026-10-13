"use client";

import { useSyncExternalStore } from "react";

const KEY = "fxb:last-visit";
let snapshot: number | null | undefined;

function read(): number | null {
  if (snapshot === undefined) {
    const v = Number(window.localStorage.getItem(KEY));
    snapshot = Number.isFinite(v) && v > 0 ? v : null;
  }
  return snapshot;
}

// 离开页面时才记下这次访问，所以本次打开期间“上次访问”保持不变。
function subscribe() {
  const save = () => window.localStorage.setItem(KEY, String(Date.now()));
  const onHide = () => document.visibilityState === "hidden" && save();
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", onHide);
  return () => {
    window.removeEventListener("pagehide", save);
    document.removeEventListener("visibilitychange", onHide);
  };
}

/** 上次离开首页的时间；首次访问为 null。 */
export function useLastVisit(): number | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
