import type { TwofaDraft } from "./types";
import { isBrowserCode, normalizeBrowserCode } from "./twofa-browser-code";
import { generateCode, normalizeSecret } from "./totp";

export type TwofaBulkRow = TwofaDraft & { line: number };

export type TwofaBulkParseResult = {
  rows: TwofaBulkRow[];
  errors: { line: number; message: string }[];
};

export const TWOFA_BULK_FORMAT_HINT =
  "Browser|Platform|ID|Pass|2FA · Platform|ID|2FA · secret only";

const HEADER_3_RE = /^platform\s*[|:]\s*id\s*[|:]\s*2fa\s*$/i;
const HEADER_4_RE = /^platform\s*[|:]\s*id\s*[|:]\s*pass\s*[|:]\s*2fa\s*$/i;
const HEADER_BROWSER_3_RE = /^browser\s*[|:]\s*platform\s*[|:]\s*id\s*[|:]\s*2fa\s*$/i;
const HEADER_BROWSER_4_RE = /^browser\s*[|:]\s*platform\s*[|:]\s*id\s*[|:]\s*pass\s*[|:]\s*2fa\s*$/i;

function splitFields(line: string): string[] {
  const sep = line.includes("|") ? "|" : line.includes(":") ? ":" : null;
  if (!sep) return [];
  return line.split(sep).map((p) => p.trim());
}

function isHeaderLine(raw: string): boolean {
  const compact = raw.replace(/\s+/g, "");
  return (
    HEADER_3_RE.test(compact) ||
    HEADER_4_RE.test(compact) ||
    HEADER_BROWSER_3_RE.test(compact) ||
    HEADER_BROWSER_4_RE.test(compact)
  );
}

type ParsedFields = Pick<TwofaDraft, "browser" | "service" | "account" | "password" | "secret">;

function parseCoreFields(parts: string[]): ParsedFields | null {
  if (parts.length === 0) return null;

  if (parts.length === 1) {
    return { browser: undefined, service: "", account: "", password: "", secret: parts[0] ?? "" };
  }

  if (parts.length === 2) {
    return { browser: undefined, service: parts[0] ?? "", account: "", password: "", secret: parts[1] ?? "" };
  }

  const service = parts[0] ?? "";
  const account = parts[1] ?? "";

  if (parts.length === 3) {
    return {
      browser: undefined,
      service,
      account,
      password: "",
      secret: parts[2] ?? "",
    };
  }

  return {
    browser: undefined,
    service,
    account,
    password: parts[2] ?? "",
    secret: parts.slice(3).join("|").trim() || (parts[3] ?? ""),
  };
}

function parseBrowserPrefixedFields(parts: string[]): ParsedFields | null {
  const browser = normalizeBrowserCode(parts[0] ?? "");
  const rest = parts.slice(1);
  if (!rest.length) return null;

  const core = parseCoreFields(rest);
  if (!core) return null;
  return { ...core, browser: browser || undefined };
}

/**
 * Parse line as secret-only, `Platform|2FA`, `Platform|ID|2FA`, `Platform|ID|Pass|2FA`,
 * or browser-prefixed variants (`Browser|Platform|ID|2FA`, `Browser|Platform|ID|Pass|2FA`).
 */
export function parseTwofaBulkLine(parts: string[]): ParsedFields | null {
  if (parts.length === 0) return null;

  if (parts.length > 1 && isBrowserCode(parts[0] ?? "")) {
    return parseBrowserPrefixedFields(parts);
  }

  return parseCoreFields(parts);
}

/** Parse bulk text — supports legacy and browser-prefixed rows per line. */
export function parseTwofaBulkText(text: string): TwofaBulkParseResult {
  const rows: TwofaBulkRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;
    if (isHeaderLine(raw)) continue;

    const parts = splitFields(raw);
    const parsed = parseTwofaBulkLine(parts.length ? parts : [raw]);
    if (!parsed) {
      errors.push({
        line: lineNo,
        message: "Expected 2FA secret (Base32) or Platform|ID|2FA",
      });
      continue;
    }

    const { browser, service, account, password, secret } = parsed;
    if (!secret.trim()) {
      errors.push({ line: lineNo, message: "Missing 2FA secret" });
      continue;
    }

    rows.push({
      line: lineNo,
      service,
      browser: browser || undefined,
      account,
      password: password || undefined,
      secret,
    });
  }

  return { rows, errors };
}

export function validateTwofaBulkRows(rows: TwofaBulkRow[]): {
  valid: TwofaDraft[];
  invalid: { line: number; message: string }[];
} {
  const valid: TwofaDraft[] = [];
  const invalid: { line: number; message: string }[] = [];

  for (const row of rows) {
    const browserRaw = row.browser?.trim();
    if (browserRaw && !isBrowserCode(browserRaw)) {
      invalid.push({ line: row.line, message: "Browser code must be 4 digits (e.g. 0100)" });
      continue;
    }

    const draft: TwofaDraft = {
      service: row.service.trim(),
      browser: browserRaw ? normalizeBrowserCode(browserRaw) : undefined,
      account: row.account.trim(),
      password: row.password?.trim() || undefined,
      secret: normalizeSecret(row.secret),
    };
    if (!draft.secret) {
      invalid.push({ line: row.line, message: "Missing 2FA secret" });
      continue;
    }
    if (!generateCode(draft.service, draft.account, draft.secret)) {
      invalid.push({ line: row.line, message: "Invalid Base32 secret" });
      continue;
    }
    valid.push(draft);
  }

  return { valid, invalid };
}

export type TwofaBulkLineStatus =
  | { kind: "empty" }
  | { kind: "skip" }
  | { kind: "valid" }
  | { kind: "invalid"; message: string };

/** Per visible textarea line — for gutter badges (empty lines included). */
export function getTwofaBulkLineStatuses(text: string): TwofaBulkLineStatus[] {
  const lines = text.split(/\r?\n/);
  return lines.map((raw, index) => getTwofaBulkLineStatus(raw, index + 1));
}

function getTwofaBulkLineStatus(raw: string, lineNo: number): TwofaBulkLineStatus {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };
  if (trimmed.startsWith("#") || isHeaderLine(trimmed)) return { kind: "skip" };

  const parts = splitFields(trimmed);
  const parsed = parseTwofaBulkLine(parts.length ? parts : [trimmed]);
  if (!parsed) {
    return { kind: "invalid", message: "Expected 2FA secret (Base32) or Platform|ID|2FA" };
  }
  if (!parsed.secret.trim()) {
    return { kind: "invalid", message: "Missing 2FA secret" };
  }

  const row: TwofaBulkRow = {
    line: lineNo,
    service: parsed.service,
    browser: parsed.browser,
    account: parsed.account,
    password: parsed.password || undefined,
    secret: parsed.secret,
  };
  const { valid, invalid } = validateTwofaBulkRows([row]);
  if (valid.length) return { kind: "valid" };
  return { kind: "invalid", message: invalid[0]?.message ?? "Invalid row" };
}

export function summarizeTwofaBulkLineStatuses(statuses: TwofaBulkLineStatus[]): {
  valid: number;
  invalid: number;
  skip: number;
} {
  let valid = 0;
  let invalid = 0;
  let skip = 0;
  for (const status of statuses) {
    if (status.kind === "valid") valid += 1;
    else if (status.kind === "invalid") invalid += 1;
    else if (status.kind === "skip") skip += 1;
  }
  return { valid, invalid, skip };
}

/** Detected row schema label for gutter (e.g. Browser|Platform|ID|2FA). */
export function detectTwofaBulkLineFormat(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return null;
  if (isHeaderLine(trimmed)) return "Header";

  const parts = splitFields(trimmed);
  const effectiveParts = parts.length ? parts : [trimmed];
  const hasBrowser = effectiveParts.length > 1 && isBrowserCode(effectiveParts[0] ?? "");
  const core = hasBrowser ? effectiveParts.slice(1) : effectiveParts;

  if (hasBrowser) {
    const prefix = "Browser|";
    if (core.length === 1) return `${prefix}2FA`;
    if (core.length === 2) return `${prefix}Platform|2FA`;
    if (core.length === 3) return `${prefix}Platform|ID|2FA`;
    return `${prefix}Platform|ID|Pass|2FA`;
  }

  if (effectiveParts.length === 1) return "2FA";
  if (effectiveParts.length === 2) return "Platform|2FA";
  if (effectiveParts.length === 3) return "Platform|ID|2FA";
  return "Platform|ID|Pass|2FA";
}

export function getTwofaBulkLineFormats(text: string): (string | null)[] {
  const lines = text.split(/\r?\n/);
  return lines.map((raw) => detectTwofaBulkLineFormat(raw));
}

/** Tooltip lines for format badge — parsed field breakdown. */
export function describeTwofaBulkLineFields(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return "Comment line (skipped)";
  if (isHeaderLine(trimmed)) return "Header row (skipped)";

  const parts = splitFields(trimmed);
  const parsed = parseTwofaBulkLine(parts.length ? parts : [trimmed]);
  if (!parsed) return null;

  const lines: string[] = [];
  if (parsed.browser) lines.push(`Browser: ${parsed.browser}`);
  if (parsed.service) lines.push(`Platform: ${parsed.service}`);
  if (parsed.account) lines.push(`ID: ${parsed.account}`);
  if (parsed.password) lines.push(`Pass: ${parsed.password}`);
  if (parsed.secret) lines.push(`2FA: ${parsed.secret}`);

  if (!lines.length) return null;
  if (lines.length === 1 && parsed.secret && !parsed.service && !parsed.browser) {
    return `2FA secret: ${parsed.secret}`;
  }
  return lines.join("\n");
}

export function formatTwofaBulkLine(draft: TwofaDraft): string {
  const browser = draft.browser?.trim();
  const pass = draft.password?.trim();
  const core = pass
    ? `${draft.service}|${draft.account}|${pass}|${draft.secret}`
    : `${draft.service}|${draft.account}|${draft.secret}`;
  return browser ? `${browser}|${core}` : core;
}
