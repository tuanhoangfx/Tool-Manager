#!/usr/bin/env node
/**
 * Backfill twofa_accounts.ownership from legacy `Ownership: …` note prefix.
 * Usage: node scripts/backfill-twofa-ownership-from-note.mjs [--apply]
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

const OWNERSHIP_NOTE_RE = /^Ownership:\s*(.+?)(?:\r?\n|$)/m;

function stripEmojiLabel(s) {
  return String(s ?? "")
    .trim()
    .replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/gu, "")
    .trim()
    .toLowerCase();
}

function mapOwnership(raw) {
  const label = stripEmojiLabel(raw);
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
  for (const [needle, id] of Object.entries(aliases)) {
    if (label.includes(needle)) return id;
  }
  return "undefined";
}

function stripOwnershipLine(note) {
  return String(note ?? "")
    .trim()
    .replace(/^Ownership:\s*.+?(?:\r?\n|$)/m, "")
    .trim();
}

const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
}).then((r) => r.json());

let offset = 0;
const updates = [];
while (true) {
  const rows = await fetch(
    `${url}/rest/v1/twofa_accounts?select=id,note,ownership&deleted_at=is.null&offset=${offset}&limit=500`,
    { headers: { apikey: key, Authorization: `Bearer ${auth.access_token}` } },
  ).then((r) => r.json());
  if (!rows.length) break;
  for (const row of rows) {
    const match = String(row.note ?? "").match(OWNERSHIP_NOTE_RE);
    if (!match?.[1] && row.ownership && row.ownership !== "undefined") continue;
    const ownership = match?.[1] ? mapOwnership(match[1]) : row.ownership || "undefined";
    const note = stripOwnershipLine(row.note);
    if (!match?.[1] && row.ownership === ownership && note === String(row.note ?? "").trim()) continue;
    updates.push({ id: row.id, ownership, note });
  }
  if (rows.length < 500) break;
  offset += 500;
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", updates: updates.length }, null, 2));
if (!apply) process.exit(0);

let done = 0;
for (const row of updates) {
  await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${row.id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${auth.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ ownership: row.ownership, note: row.note }),
  });
  done += 1;
  if (done % 200 === 0) console.log(`PATCHED ${done}/${updates.length}`);
}
console.log("BACKFILL_OK", done);
