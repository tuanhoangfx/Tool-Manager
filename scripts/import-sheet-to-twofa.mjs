#!/usr/bin/env node
/**
 * Import Google Sheet account rows into 2FA vault (Supabase).
 *
 * Usage:
 *   node scripts/import-sheet-to-twofa.mjs --dry-run
 *   node scripts/import-sheet-to-twofa.mjs --apply
 *   node scripts/import-sheet-to-twofa.mjs --apply --csv path.csv --ownership CzP
 *
 * Defaults: sheet gid 904261513, no ownership filter (all rows). Pass --ownership CzP to narrow.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHEET_ID = "1GZiFdVYZyiXMurMYOwn5WyEwQ-DtEzlfhcsFJzE1Bm8";
const SHEET_GID = "904261513";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = args.includes("--dry-run") || !apply;
const csvArgIdx = args.indexOf("--csv");
const csvPath =
  csvArgIdx >= 0 ? resolve(process.cwd(), args[csvArgIdx + 1]) : resolve(root, "scripts/_tmp-sheet-import.csv");
const ownArgIdx = args.indexOf("--ownership");
const ownershipFilter = ownArgIdx >= 0 ? args[ownArgIdx + 1] : null;

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(resolve(root, "../../.env.shared"));
loadEnvFile(resolve(root, ".env.local"));

const url = process.env.VITE_TWOFA_SUPABASE_URL;
const key = process.env.VITE_TWOFA_SUPABASE_ANON_KEY;
const email = process.env.TWOFA_IMPORT_EMAIL ?? "czpgo@outlook.com";
const password = process.env.TWOFA_IMPORT_PASSWORD ?? "123123";

if (!url || !key) {
  console.error("FAIL: missing VITE_TWOFA_SUPABASE_* in .env.local");
  process.exit(2);
}

function normCell(v) {
  const s = String(v ?? "").trim();
  if (s === "undefined" || s === "null") return "";
  return s;
}

function stripEmojiLabel(s) {
  return normCell(s).replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/gu, "").trim();
}

function csvToMatrix(text) {
  const wb = XLSX.read(text, { type: "string", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }).map((row) => row.map(normCell));
}

function detectHeaderRowIndex(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const cells = (matrix[i] ?? []).map(normCell).filter(Boolean);
    if (cells.length < 2) continue;
    if (cells.filter((c) => /^https?:\/\//i.test(c)).length >= 2) continue;
    if (cells.some((c) => c.includes("Site") || c.includes("ID|Pass"))) return i;
  }
  return 0;
}

function isBrowserCode(v) {
  return /^\d{4}$/.test(String(v ?? "").trim());
}

function isPlausibleTotpSecret(v) {
  const s = String(v ?? "").replace(/\s+/g, "").toUpperCase();
  return s.length >= 8 && /^[A-Z2-7]+=*$/.test(s);
}

function parseBulkLine(parts) {
  if (!parts.length) return null;
  let browser;
  let rest = parts;
  if (parts.length > 1 && isBrowserCode(parts[0])) {
    browser = parts[0];
    rest = parts.slice(1);
  }
  if (rest.length === 1) return { browser, service: "", account: "", password: "", secret: rest[0] };
  if (rest.length === 2) return { browser, service: rest[0], account: "", password: "", secret: rest[1] };
  const service = rest[0] ?? "";
  const account = rest[1] ?? "";
  if (rest.length === 3) {
    const third = rest[2] ?? "";
    if (account.trim() && third && !isPlausibleTotpSecret(third)) {
      return { browser, service, account, password: third, secret: "" };
    }
    return { browser, service, account, password: "", secret: third };
  }
  return {
    browser,
    service,
    account,
    password: rest[2] ?? "",
    secret: rest.slice(3).join("|").trim() || (rest[3] ?? ""),
  };
}

function parseSheetTimestamp(s) {
  const raw = normCell(s);
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return 0;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3];
  if (yy.length === 2) yy = `20${yy}`;
  const HH = (m[4] ?? "00").padStart(2, "0");
  const MM = (m[5] ?? "00").padStart(2, "0");
  const t = Date.parse(`${yy}-${mm}-${dd}T${HH}:${MM}:00`);
  return Number.isFinite(t) ? t : 0;
}

function mapSheetStatus(statusRaw, ownershipRaw) {
  const s = `${statusRaw} ${ownershipRaw}`.toLowerCase();
  if (s.includes("appeal")) return "appeal";
  if (s.includes("disable") || s.includes("dead") || s.includes("ban")) return "disable";
  if (s.includes("error")) return "error";
  if (s.includes("incorrect")) return "incorrect_info";
  return "active";
}

function slotKey(service, account) {
  return `${service.trim().toLowerCase()}\0${account.trim().toLowerCase()}`;
}

function mapSheetOwnership(raw) {
  const label = stripEmojiLabel(raw).toLowerCase();
  const aliases = {
    czp: "czp",
    buyer: "buyer",
    ready: "ready",
    appeal: "appeal",
    usable: "usable",
    rent: "rent",
    sell: "sell",
    give: "give",
    resell: "resell",
    storage: "storage",
  };
  for (const [key, id] of Object.entries(aliases)) {
    if (label.includes(key)) return id;
  }
  return "undefined";
}

function buildAuxNote(fields) {
  const lines = [];
  const push = (label, value) => {
    const v = normCell(value);
    if (v) lines.push(`${label}: ${v}`);
  };
  push("Mail password", fields.mailPassword);
  push("Mail 2FA", fields.mail2fa);
  push("Mail GPM", fields.mailGpm);
  push("Phone", fields.phone);
  push("Creation", fields.creation);
  push("Timestamp", fields.timestamp);
  push("Full info", fields.fullInfo);
  push("Plan package", fields.planPackage);
  push("Plan status", fields.planStatus);
  push("Plan notes", fields.planNotes);
  push("Plan date", fields.planDate);
  push("Plan due", fields.planDue);
  if (fields.sheetNote) lines.push(fields.sheetNote);
  return lines.join("\n").trim();
}

function ownershipMatches(raw) {
  if (!ownershipFilter) return true;
  const v = normCell(raw);
  if (!v) return false;
  const needle = ownershipFilter.toLowerCase();
  return v.toLowerCase().includes(needle) || stripEmojiLabel(v).toLowerCase().includes(needle);
}

async function fetchCsv() {
  if (existsSync(csvPath)) return readFileSync(csvPath, "utf8");
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(SHEET_GID)}`;
  const res = await fetch(exportUrl);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  return res.text();
}

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const auth = await res.json();
  if (!auth.access_token) throw new Error(auth.error_description ?? "AUTH_FAIL");
  return auth;
}

async function fetchVaultIndex(userId, token) {
  const bySlot = new Map();
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${url}/rest/v1/twofa_accounts?select=id,service,account,browser&user_id=eq.${userId}&deleted_at=is.null&order=id.asc&offset=${offset}&limit=${pageSize}`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } },
    );
    const batch = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(batch));
    if (!batch.length) break;
    for (const row of batch) {
      const k = slotKey(row.service, row.account);
      if (!k.trim()) continue;
      if (!bySlot.has(k)) bySlot.set(k, row);
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return bySlot;
}

async function patchRow(token, id, payload) {
  const res = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${id} ${res.status}: ${body}`);
  }
}

async function insertRows(token, rows) {
  const res = await fetch(`${url}/rest/v1/twofa_accounts`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`INSERT ${res.status}: ${body}`);
  }
}

const csv = await fetchCsv();
const matrix = csvToMatrix(csv);
const headerIdx = detectHeaderRowIndex(matrix);
const headers = matrix[headerIdx] ?? [];
const dataRows = matrix.slice(headerIdx + 1);

const findCol = (pred) => headers.findIndex(pred);
const cols = {
  site: findCol((h) => h.includes("Site")),
  ownership: findCol((h) => h.includes("Ownership")),
  status: findCol((h) => h.includes("Status") && !h.includes("Plan") && !h.includes("Rank")),
  idPass: findCol((h) => h.includes("ID|Pass")),
  gpm: findCol((h) => h.includes("GPM") && !h.includes("Mail")),
  mail: findCol((h) => h.includes("Mail") && !h.includes("Password") && !h.includes("2FA") && !h.includes("GPM")),
  mailPassword: findCol((h) => h.includes("Mail Password")),
  mail2fa: findCol((h) => h.includes("Mail 2FA")),
  mailGpm: findCol((h) => h.includes("Mail GPM")),
  fullInfo: findCol((h) => h.includes("Full Info")),
  full2fa: findCol((h) => h.includes("Full 2FA")),
  phone: findCol((h) => h.includes("Phone")),
  timestamp: findCol((h) => h.includes("Timestamp")),
  creation: findCol((h) => h.includes("Creation")),
  note: findCol((h) => h.includes("Note") && !h.includes("Plan")),
  planPackage: findCol((h) => h.includes("Plan Package")),
  planStatus: findCol((h) => h.includes("Plan Status")),
  planNotes: findCol((h) => h.includes("Plan Notes")),
  planDate: findCol((h) => h.includes("Date") && h.includes("📅")),
  planDue: findCol((h) => h.includes("Due")),
};

const get = (row, idx) => (idx >= 0 ? normCell(row[idx]) : "");

const parsed = [];
let skippedOwnership = 0;
let skippedEmpty = 0;

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i];
  const ownership = get(row, cols.ownership);
  if (!ownershipMatches(ownership)) {
    skippedOwnership++;
    continue;
  }

  const site = get(row, cols.site);
  const full2fa = get(row, cols.full2fa);
  const idPass = get(row, cols.idPass);
  const gpm = get(row, cols.gpm);
  if (!site && !full2fa && !idPass) {
    skippedEmpty++;
    continue;
  }

  let draft = null;
  if (full2fa) {
    const p = parseBulkLine(full2fa.split("|").map((x) => x.trim()));
    if (p && (p.service || p.account || p.secret)) {
      draft = {
        service: p.service || site,
        browser: p.browser || (isBrowserCode(gpm) ? gpm : undefined),
        account: p.account,
        password: p.password || undefined,
        secret: p.secret || "",
      };
    }
  }
  if (!draft && (site || idPass)) {
    const parts = idPass.split("|").map((x) => x.trim());
    draft = {
      service: site,
      browser: isBrowserCode(gpm) ? gpm : undefined,
      account: parts[0] ?? "",
      password: parts[1] || undefined,
      secret: parts[2] ?? "",
    };
  }
  if (!draft) continue;

  const timestamp = get(row, cols.timestamp);
  const sheetNote = get(row, cols.note);
  const ownership = mapSheetOwnership(get(row, cols.ownership));
  const mailRecover = get(row, cols.mail);
  const note = buildAuxNote({
    mailPassword: get(row, cols.mailPassword),
    mail2fa: get(row, cols.mail2fa),
    mailGpm: get(row, cols.mailGpm),
    phone: get(row, cols.phone),
    creation: get(row, cols.creation),
    timestamp,
    fullInfo: get(row, cols.fullInfo),
    planPackage: get(row, cols.planPackage),
    planStatus: get(row, cols.planStatus),
    planNotes: get(row, cols.planNotes),
    planDate: get(row, cols.planDate),
    planDue: get(row, cols.planDue),
    sheetNote,
  });

  parsed.push({
    line: headerIdx + i + 2,
    draft: {
      ...draft,
      ownership,
      ...(mailRecover ? { mailRecover } : {}),
      note: note || undefined,
      status: mapSheetStatus(get(row, cols.status), ownership),
    },
    ts: parseSheetTimestamp(timestamp),
  });
}

const bySlot = new Map();
for (const item of parsed) {
  const k = slotKey(item.draft.service, item.draft.account);
  if (!k.trim() && !item.draft.secret) continue;
  const prev = bySlot.get(k);
  if (!prev || item.ts > prev.ts || (item.ts === prev.ts && item.line > prev.line)) {
    bySlot.set(k, item);
  }
}

const finalRows = [...bySlot.values()];
const auth = await signIn();
const vaultIndex = await fetchVaultIndex(auth.user.id, auth.access_token);

let toInsert = 0;
let toUpdate = 0;
const now = new Date().toISOString();
const inserts = [];
const updates = [];

for (const item of finalRows) {
  const d = item.draft;
  const k = slotKey(d.service, d.account);
  const existing = k.trim() ? vaultIndex.get(k) : null;
  const fields = {
    service: d.service.trim(),
    browser: d.browser?.trim() || null,
    account: d.account.trim(),
    password: d.password?.trim() || null,
    secret: d.secret ?? "",
    mail_recover: d.mailRecover?.trim() || null,
    note: d.note?.trim() || "",
    status: d.status,
    ownership: d.ownership ?? "undefined",
    updated_at: now,
    deleted_at: null,
  };

  if (existing) {
    toUpdate++;
    updates.push({ id: existing.id, fields });
  } else {
    toInsert++;
    inserts.push({
      id: crypto.randomUUID(),
      user_id: auth.user.id,
      ...fields,
      log: [],
      created_at: now,
      last_used_at: null,
    });
  }
}

console.log(
  JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "apply",
      ownershipFilter: ownershipFilter ?? "(all rows)",
      sheetRows: dataRows.length,
      skippedOwnership,
      skippedEmpty,
      parsedBeforeDedupe: parsed.length,
      afterDedupe: finalRows.length,
      toInsert,
      toUpdate,
      withSecret: finalRows.filter((r) => r.draft.secret).length,
      withoutSecret: finalRows.filter((r) => !r.draft.secret).length,
    },
    null,
    2,
  ),
);

if (dryRun) {
  console.log("DRY_RUN_OK — pass --apply to import");
  process.exit(0);
}

const BATCH = 40;
let done = 0;
for (let i = 0; i < inserts.length; i += BATCH) {
  const chunk = inserts.slice(i, i + BATCH);
  await insertRows(auth.access_token, chunk);
  done += chunk.length;
  console.log(`INSERTED ${done}/${inserts.length}`);
}

done = 0;
for (let i = 0; i < updates.length; i += BATCH) {
  const batch = updates.slice(i, i + BATCH);
  await Promise.all(batch.map(({ id, fields }) => patchRow(auth.access_token, id, fields)));
  done += batch.length;
  console.log(`UPDATED ${done}/${updates.length}`);
}

console.log("IMPORT_OK", { inserted: toInsert, updated: toUpdate, total: inserts.length + updates.length });
