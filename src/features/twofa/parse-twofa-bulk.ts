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

export function formatTwofaBulkLine(draft: TwofaDraft): string {
  const browser = draft.browser?.trim();
  const pass = draft.password?.trim();
  const core = pass
    ? `${draft.service}|${draft.account}|${pass}|${draft.secret}`
    : `${draft.service}|${draft.account}|${draft.secret}`;
  return browser ? `${browser}|${core}` : core;
}

export async function parseTwofaBulkFile(file: File): Promise<TwofaBulkParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseTwofaBulkExcel(file);
  }
  const text = await file.text();
  return parseTwofaBulkText(text);
}

async function parseTwofaBulkExcel(file: File): Promise<TwofaBulkParseResult> {
  const buf = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const book = XLSX.read(buf, { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0] ?? ""];
  if (!sheet) {
    return { rows: [], errors: [{ line: 0, message: "Empty workbook" }] };
  }

  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
  const lines = matrix
    .map((row) => row.map((c) => String(c ?? "").trim()).join("|"))
    .filter((line) => line.replace(/\|/g, "").trim().length > 0)
    .join("\n");

  return parseTwofaBulkText(lines);
}
