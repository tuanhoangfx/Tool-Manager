import { formatTwofaAccountStatus } from "./twofa-account-status";
import type {
  TwofaAccount,
  TwofaAccountLogChange,
  TwofaAccountLogEntry,
  TwofaAccountLogField,
} from "./types";

const MAX_LOG_ENTRIES = 80;

const LOG_FIELDS = new Set<TwofaAccountLogField>([
  "service",
  "browser",
  "account",
  "password",
  "secret",
  "status",
  "note",
]);

function normalizeLogChange(raw: unknown): TwofaAccountLogChange | null {
  if (!raw || typeof raw !== "object") return null;
  const field = "field" in raw && typeof raw.field === "string" ? raw.field.trim() : "";
  if (!LOG_FIELDS.has(field as TwofaAccountLogField)) return null;
  const before = "before" in raw && typeof raw.before === "string" ? raw.before : undefined;
  const after = "after" in raw && typeof raw.after === "string" ? raw.after : undefined;
  return { field: field as TwofaAccountLogField, before, after };
}

export function normalizeTwofaLog(entries: unknown): TwofaAccountLogEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: TwofaAccountLogEntry[] = [];
  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const at = "at" in item && typeof item.at === "string" ? item.at.trim() : "";
    const message = "message" in item && typeof item.message === "string" ? item.message.trim() : "";
    if (!at || !message) continue;
    const changesRaw = "changes" in item && Array.isArray(item.changes) ? item.changes : [];
    const changes = changesRaw
      .map((change) => normalizeLogChange(change))
      .filter((change): change is TwofaAccountLogChange => Boolean(change));
    out.push(changes.length ? { at, message, changes } : { at, message });
  }
  return out;
}

export function appendTwofaLogEntry(
  existing: TwofaAccountLogEntry[] | undefined,
  entry: TwofaAccountLogEntry,
): TwofaAccountLogEntry[] {
  const message = entry.message.trim();
  if (!message || !entry.at.trim()) return existing ? [...existing] : [];
  const next = [...(existing ?? []), { ...entry, message }];
  return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
}

export function appendTwofaLog(
  existing: TwofaAccountLogEntry[] | undefined,
  message: string,
  at: string,
): TwofaAccountLogEntry[] {
  return appendTwofaLogEntry(existing, { at, message });
}

export function latestTwofaLogEntry(account: TwofaAccount): TwofaAccountLogEntry | null {
  const entries = account.log;
  if (!entries?.length) return null;
  return entries[entries.length - 1] ?? null;
}

function maskValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "—";
}

function secretFingerprint(secret: string | undefined): string {
  const trimmed = secret?.trim();
  if (!trimmed) return "—";
  return trimmed.length <= 4 ? "••••" : `${trimmed.slice(0, 2)}…${trimmed.slice(-2)}`;
}

/** Structured field deltas for vault audit log. */
export function buildTwofaUpdateLogChanges(
  before: TwofaAccount,
  after: TwofaAccount,
): TwofaAccountLogChange[] {
  const changes: TwofaAccountLogChange[] = [];

  if (before.service.trim() !== after.service.trim()) {
    changes.push({
      field: "service",
      before: maskValue(before.service),
      after: maskValue(after.service),
    });
  }
  if ((before.browser ?? "").trim() !== (after.browser ?? "").trim()) {
    changes.push({
      field: "browser",
      before: maskValue(before.browser),
      after: maskValue(after.browser),
    });
  }
  if (before.account.trim() !== after.account.trim()) {
    changes.push({
      field: "account",
      before: maskValue(before.account),
      after: maskValue(after.account),
    });
  }
  if ((before.password ?? "").trim() !== (after.password ?? "").trim()) {
    changes.push({ field: "password", after: "updated" });
  }
  if (before.secret.trim() !== after.secret.trim()) {
    changes.push({
      field: "secret",
      before: secretFingerprint(before.secret),
      after: secretFingerprint(after.secret),
    });
  }
  if (before.status !== after.status) {
    changes.push({
      field: "status",
      before: formatTwofaAccountStatus(before.status),
      after: formatTwofaAccountStatus(after.status),
    });
  }
  if ((before.note ?? "").trim() !== (after.note ?? "").trim()) {
    changes.push({
      field: "note",
      before: maskValue(before.note),
      after: maskValue(after.note),
    });
  }

  return changes;
}

function formatLogChangeLine(change: TwofaAccountLogChange, labels: Record<TwofaAccountLogField, string>): string {
  const label = labels[change.field] ?? change.field;
  if (change.field === "password" && change.after === "updated") {
    return `${label} updated`;
  }
  if (change.before !== undefined && change.after !== undefined) {
    return `${label}: ${change.before} → ${change.after}`;
  }
  if (change.after !== undefined) return `${label}: ${change.after}`;
  return label;
}

/** Build human-readable change summary for vault audit log. */
export function buildTwofaUpdateLogMessage(
  before: TwofaAccount,
  after: TwofaAccount,
  labels?: Record<TwofaAccountLogField, string>,
): string {
  const changes = buildTwofaUpdateLogChanges(before, after);
  if (!changes.length) return "Account updated";
  const fallbackLabels = labels ?? {
    service: "Service",
    browser: "Browser",
    account: "Account",
    password: "Password",
    secret: "Secret",
    status: "Status",
    note: "Note",
  };
  return changes.map((change) => formatLogChangeLine(change, fallbackLabels)).join(" · ");
}

export function withTwofaCreateLog(row: TwofaAccount, at: string): TwofaAccount {
  return { ...row, log: appendTwofaLog(row.log, "Account created", at) };
}

export function withTwofaUpdateLog(before: TwofaAccount, after: TwofaAccount, at: string): TwofaAccount {
  const changes = buildTwofaUpdateLogChanges(before, after);
  const message = buildTwofaUpdateLogMessage(before, after);
  return {
    ...after,
    log: appendTwofaLogEntry(after.log ?? before.log, {
      at,
      message,
      ...(changes.length ? { changes } : {}),
    }),
  };
}

/** Seed audit log for legacy rows — import + last known update. */
export function backfillTwofaAccountLog(row: TwofaAccount): TwofaAccount {
  const log = normalizeTwofaLog(row.log);
  if (log.length) return { ...row, log };

  const entries: TwofaAccountLogEntry[] = [{ at: row.createdAt, message: "Account imported" }];
  if (row.updatedAt && row.updatedAt !== row.createdAt) {
    entries.push({ at: row.updatedAt, message: "Account updated" });
  }
  return { ...row, log: entries };
}
