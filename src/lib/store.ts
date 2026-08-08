"use client";

import { useSyncExternalStore, useCallback } from "react";
import type { Session, RecallTest, StoreShape, RecallInterval } from "./types";

const KEY = "firsthand.v1";

const EMPTY: StoreShape = { version: 1, sessions: [], recallTests: [] };

let cache: StoreShape | null = null;
const listeners = new Set<() => void>();

function read(): StoreShape {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as StoreShape) : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function write(next: StoreShape) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — state still lives in memory for this tab.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): StoreShape {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function upsertSession(session: Session) {
  const s = read();
  const idx = s.sessions.findIndex((x) => x.id === session.id);
  const sessions =
    idx === -1
      ? [...s.sessions, session]
      : s.sessions.map((x) => (x.id === session.id ? session : x));
  write({ ...s, sessions });
}

export function getSession(id: string): Session | undefined {
  return read().sessions.find((s) => s.id === id);
}

export function activeSession(mode?: string): Session | undefined {
  return read().sessions.find(
    (s) => s.phase !== "complete" && (!mode || s.mode === mode)
  );
}

export function abandonSession(id: string) {
  const s = read();
  write({ ...s, sessions: s.sessions.filter((x) => x.id !== id) });
}

const RECALL_MS: Record<RecallInterval, number> = {
  "10m": 10 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

export function scheduleRecall(session: Session, interval: RecallInterval) {
  const s = read();
  const test: RecallTest = {
    id: `${session.id}-recall`,
    sessionId: session.id,
    taskTitle: session.task.title,
    interval,
    dueAt: new Date(Date.now() + RECALL_MS[interval]).toISOString(),
  };
  write({
    ...s,
    recallTests: [...s.recallTests.filter((t) => t.id !== test.id), test],
  });
}

export function completeRecall(id: string, passed: boolean) {
  const s = read();
  write({
    ...s,
    recallTests: s.recallTests.map((t) =>
      t.id === id
        ? { ...t, completedAt: new Date().toISOString(), passed }
        : t
    ),
  });
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
