"use client";

import { useSyncExternalStore } from "react";
import type {
  AutonomyTestResult,
  Session,
  RecallTest,
  StoreShape,
  RecallInterval,
} from "./types";

const KEY = "firsthand.v1";

const EMPTY: StoreShape = {
  version: 1,
  sessions: [],
  recallTests: [],
  autonomyTests: [],
};

let cache: StoreShape | null = null;
const listeners = new Set<() => void>();

/**
 * Records written before a collection existed are missing that key, so every
 * array is defaulted on read rather than trusted from the parsed blob.
 */
function normalize(parsed: Partial<StoreShape> | null): StoreShape {
  return {
    version: 1,
    sessions: parsed?.sessions ?? [],
    recallTests: parsed?.recallTests ?? [],
    autonomyTests: parsed?.autonomyTests ?? [],
  };
}

function read(): StoreShape {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = normalize(raw ? (JSON.parse(raw) as Partial<StoreShape>) : null);
  } catch {
    cache = normalize(null);
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

/* ---------------- Autonomy Test ---------------- */

export function saveAutonomyTest(result: AutonomyTestResult) {
  const s = read();
  const idx = s.autonomyTests.findIndex((t) => t.id === result.id);
  const autonomyTests =
    idx === -1
      ? [...s.autonomyTests, result]
      : s.autonomyTests.map((t) => (t.id === result.id ? result : t));
  write({ ...s, autonomyTests });
}

/** The most recent test whose delayed retrieval probe is still open. */
export function openRetrievalProbe(): AutonomyTestResult | undefined {
  return read()
    .autonomyTests.filter((t) => !t.retrieval.completedAt)
    .slice(-1)[0];
}

export function completeRetrievalProbe(
  testId: string,
  unaidedPoints: number,
  unaidedAnswer: string
) {
  const s = read();
  write({
    ...s,
    autonomyTests: s.autonomyTests.map((t) =>
      t.id === testId
        ? {
            ...t,
            retrieval: {
              ...t.retrieval,
              unaidedPoints,
              unaidedAnswer,
              completedAt: new Date().toISOString(),
            },
          }
        : t
    ),
  });
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
