#!/usr/bin/env node
/**
 * Backfill twofa_accounts.mail_recover from legacy `Mail: …` note line.
 * Usage: node scripts/backfill-twofa-mail-recover-from-note.mjs [--apply]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");

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

const MAIL_NOTE_RE = /^Mail:\s*(.+?)(?:\r?\n|$)/m;

function extractMailRecover(note) {
  const m = String(note ?? "").match(MAIL_NOTE_RE);
  return m?.[1]?.trim() ?? "";
}

function stripMailLine(note) {
  return String(note ?? "")
    .trim()
    .replace(/^Mail:\s*.+?(?:\r?\n|$)/m, "")
    .trim();
}

const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
}).then((r) => r.json());

if (!auth.access_token) {
  console.error("AUTH_FAIL", auth);
  process.exit(2);
}

let offset = 0;
const updates = [];
while (true) {
  const rows = await fetch(
    `${url}/rest/v1/twofa_accounts?select=id,note,mail_recover&deleted_at=is.null&offset=${offset}&limit=500`,
    { headers: { apikey: key, Authorization: `Bearer ${auth.access_token}` } },
  ).then((r) => r.json());

  if (!Array.isArray(rows) || !rows.length) break;

  for (const row of rows) {
    if (row.mail_recover?.trim()) continue;
    const mail = extractMailRecover(row.note);
    if (!mail) continue;
    const note = stripMailLine(row.note);
    updates.push({
      id: row.id,
      mail_recover: mail,
      note: note || "",
    });
  }
  offset += rows.length;
  if (rows.length < 500) break;
}

console.log(`Found ${updates.length} row(s) to backfill mail_recover`);
if (!apply) {
  console.log("DRY_RUN — pass --apply to patch");
  process.exit(0);
}

let done = 0;
for (const patch of updates) {
  const { id, ...fields } = patch;
  const res = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${auth.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    console.error("PATCH_FAIL", id, await res.text());
    process.exit(3);
  }
  done += 1;
  if (done % 100 === 0) console.log(`PATCHED ${done}/${updates.length}`);
}

console.log(`OK — patched ${done} row(s). Open 2FA tab to sync local cache.`);
