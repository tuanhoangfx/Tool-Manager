import type { TwofaDraft } from "./types";
import { generateCode, normalizeSecret } from "./totp";

export type TwofaBulkRow = TwofaDraft & { line: number };

export type TwofaBulkParseResult = {
  rows: TwofaBulkRow[];
  errors: { line: number; message: string }[];
};

const HEADER_3_RE = /^platform\s*[|:]\s*id\s*[|:]\s*2fa\s*$/i;
const HEADER_4_RE = /^platform\s*[|:]\s*id\s*[|:]\s*pass\s*[|:]\s*2fa\s*$/i;

function splitFields(line: string): string[] {
  const sep = line.includes("|") ? "|" : line.includes(":") ? ":" : null;
  if (!sep) return [];
  return line.split(sep).map((p) => p.trim());
}

function isHeaderLine(raw: string): boolean {
  const compact = raw.replace(/\s+/g, "");
  return HEADER_3_RE.test(compact) || HEADER_4_RE.test(compact);
}

/** Parse line as `Platform|ID|2FA` (3 fields) or `Platform|ID|Pass|2FA` (4+ fields). */
export function parseTwofaBulkLine(parts: string[]): Pick<TwofaDraft, "service" | "account" | "password" | "secret"> | null {
  if (parts.length < 3) return null;

  const service = parts[0] ?? "";
  const account = parts[1] ?? "";

  if (parts.length === 3) {
    return {
      service,
      account,
      password: "",
      secret: parts[2] ?? "",
    };
  }

  return {
    service,
    account,
    password: parts[2] ?? "",
    secret: parts.slice(3).join("|").trim() || (parts[3] ?? ""),
  };
}

/** Parse bulk text: `Platform|ID|2FA` or `Platform|ID|Pass|2FA` per line. */
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
    const parsed = parseTwofaBulkLine(parts);
    if (!parsed) {
      errors.push({
        line: lineNo,
        message: "Expected Platform|ID|2FA or Platform|ID|Pass|2FA",
      });
      continue;
    }

    const { service, account, password, secret } = parsed;
    if (!service || !account || !secret) {
      errors.push({ line: lineNo, message: "Missing platform, ID, or 2FA secret" });
      continue;
    }

    rows.push({
      line: lineNo,
      service,
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
    const draft: TwofaDraft = {
      service: row.service.trim(),
      account: row.account.trim(),
      password: row.password?.trim() || undefined,
      secret: normalizeSecret(row.secret),
    };
    if (!draft.service || !draft.account || !draft.secret) {
      invalid.push({ line: row.line, message: "Empty field after trim" });
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
  const pass = draft.password?.trim();
  if (pass) return `${draft.service}|${draft.account}|${pass}|${draft.secret}`;
  return `${draft.service}|${draft.account}|${draft.secret}`;
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
