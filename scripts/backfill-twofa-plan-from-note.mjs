#!/usr/bin/env node
/**
 * Backfill plan_package / plan_status / plan_expires_at from note lines.
 * Usage: node scripts/backfill-twofa-plan-from-note.mjs [--apply]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePlanFieldsFromNote } from "./lib/parse-plan-from-note.mjs";

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

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`auth ${res.status}`);
  return (await res.json()).access_token;
}

async function fetchPage(token, offset) {
  const res = await fetch(
    `${url}/rest/v1/twofa_accounts?select=id,note,plan_package,plan_status,plan_tier,plan_expires_at&deleted_at=is.null&order=id.asc&offset=${offset}&limit=500`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return res.json();
}

async function patchRow(token, id, rowPatch) {
  await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ ...rowPatch, updated_at: new Date().toISOString() }),
  });
}

const token = await signIn();
let offset = 0;
let updated = 0;
let scanned = 0;

while (true) {
  const page = await fetchPage(token, offset);
  if (!page.length) break;
  for (const row of page) {
    scanned += 1;
    const parsed = parsePlanFieldsFromNote(row.note);
    const rowPatch = {};
    if (parsed.planPackage && !row.plan_package) rowPatch.plan_package = parsed.planPackage;
    if (parsed.planStatus && !row.plan_status) rowPatch.plan_status = parsed.planStatus;
    if (parsed.planTier && !row.plan_tier) rowPatch.plan_tier = parsed.planTier;
    if (parsed.planExpiresAt && !row.plan_expires_at) rowPatch.plan_expires_at = parsed.planExpiresAt;
    if (!Object.keys(rowPatch).length) continue;
    updated += 1;
    console.log(`  ${row.id.slice(0, 8)} → ${JSON.stringify(rowPatch)}`);
    if (apply) await patchRow(token, row.id, rowPatch);
  }
  if (page.length < 500) break;
  offset += 500;
}

console.log(`Scanned ${scanned}, would update ${updated}${apply ? " (applied)" : " — dry-run"}`);
