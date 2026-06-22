import { useEffect, useState } from "react";
import { formatHubRelativeTime } from "@tool-workspace/hub-ui";
import type { TwofaAccount } from "./types";

/** Prefer dedicated last-used timestamp when present; fall back to updatedAt. */
export function twofaActivityAt(account: TwofaAccount): string {
  return account.lastUsedAt?.trim() || account.updatedAt;
}

/** Absolute hub date — tooltips / audit detail. */
export function fmtHubDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseHubTime(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : null;
}

/** Relative age — SSOT `formatHubRelativeTime` (P0003 Profile / hub-ui). */
export function fmtHubRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  const ts = parseHubTime(iso);
  if (ts == null) return "—";
  return formatHubRelativeTime(ts, now);
}

/** @deprecated Use fmtHubRelativeTime — kept for callers migrating gradually. */
export function formatLastUsed(iso: string | undefined): string {
  return fmtHubRelativeTime(iso);
}

/** Shared minute tick — one interval for directory + detail modal. */
const relativeClockListeners = new Set<() => void>();
let relativeClockStarted = false;

function ensureRelativeClock() {
  if (relativeClockStarted || typeof window === "undefined") return;
  relativeClockStarted = true;
  window.setInterval(() => {
    for (const listener of relativeClockListeners) listener();
  }, 60_000);
}

/** Tick every minute while relative labels are mounted. */
export function useTwofaRelativeClockTick(enabled = true): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    ensureRelativeClock();
    const bump = () => setTick((v) => v + 1);
    relativeClockListeners.add(bump);
    return () => {
      relativeClockListeners.delete(bump);
    };
  }, [enabled]);
}

/** Current time — re-read after shared relative clock tick. */
export function useTwofaRelativeNow(enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    ensureRelativeClock();
    const bump = () => setNow(Date.now());
    relativeClockListeners.add(bump);
    return () => {
      relativeClockListeners.delete(bump);
    };
  }, [enabled]);
  return now;
}
