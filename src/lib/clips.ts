"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface Clip {
  eventId: string;
  title: string;
  summary: string;
  clippedAt: string;
}

const KEY = "fxb.clips.v1";
const listeners = new Set<() => void>();
let snapshot: Clip[] | null = null;

function read(): Clip[] {
  if (snapshot) return snapshot;
  try {
    snapshot = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Clip[];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(next: Clip[]) {
  snapshot = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: Clip[] = [];

/** 剪报只存在本机浏览器里，不上传。 */
export function useClips() {
  const clips = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const has = useCallback((id: string) => clips.some((c) => c.eventId === id), [clips]);
  const toggle = useCallback((clip: Omit<Clip, "clippedAt">) => {
    const current = read();
    if (current.some((c) => c.eventId === clip.eventId)) {
      write(current.filter((c) => c.eventId !== clip.eventId));
      return false;
    }
    write([{ ...clip, clippedAt: new Date().toISOString() }, ...current]);
    return true;
  }, []);
  const replace = useCallback((next: Clip[]) => write(next), []);
  return { clips, has, toggle, replace, ready };
}
