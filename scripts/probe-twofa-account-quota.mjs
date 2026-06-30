#!/usr/bin/env node
/**
 * Probe live quota for AI subscription rows in twofa_accounts.
 * Usage:
 *   node scripts/probe-twofa-account-quota.mjs [--apply] [--id=<uuid>] [--user=<email>]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { probeVaultAccountQuota, resolvePlatform } from "./lib/quota-probes/index.mjs";
import { parsePlanFieldsFromNote } from "./lib/parse-plan-from-note.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const idFilter = process.argv.find((a) => a.startsWith("--id="))?.slice(5);
const userEmail = process.argv.find((a) => a.startsWith("--user="))?.slice(7) ?? process.env.TWOFA_IMPORT_EMAIL ?? "czpgo@outlook.com";

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
const password = process.env.TWOFA_IMPORT_PASSWORD ?? "123123";

if (!url || !key) {
  console.error("FAIL: missing VITE_TWOFA_SUPABASE_*");
  process.exit(1);
}

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password }),
  });
  if (!res.ok) throw new Error(`auth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { token: data.access_token, userId: data.user?.id };
}

async function fetchAccounts(accessToken, userId) {
  const rows = [];
  let offset = 0;
  const pageSize = 500;
  while (true) {
    let query = `${url}/rest/v1/twofa_accounts?select=id,service,password,note,plan_package,plan_tier&user_id=eq.${userId}&deleted_at=is.null&order=service.asc&offset=${offset}&limit=${pageSize}`;
    if (idFilter) query += `&id=eq.${idFilter}`;
    const res = await fetch(query, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`fetch ${res.status}: ${await res.text()}`);
    const page = await res.json();
    if (!page.length) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return rows.filter((row) => resolvePlatform(row.service) !== "unknown");
}

async function patchRow(accessToken, id, patch) {
  const res = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patch ${id} ${res.status}: ${await res.text()}`);
}

const { token, userId } = await signIn();
const accounts = await fetchAccounts(token, userId);
console.log(`Found ${accounts.length} quota-trackable account(s)${apply ? " — applying" : " — dry-run"}`);

let ok = 0;
let err = 0;
for (const row of accounts) {
  const outcome = await probeVaultAccountQuota(row);
  const parsedPlan = parsePlanFieldsFromNote(row.note);
  const label = `${row.service} / ${row.id.slice(0, 8)}`;
  const topMetric = outcome.snapshot.metrics[0];
  const summary = topMetric
    ? `${topMetric.label}: ${topMetric.used ?? "?"}%`
    : outcome.snapshot.error ?? outcome.quotaStatus;
  console.log(`  ${outcome.quotaStatus === "ok" ? "✓" : "·"} ${label} — ${summary}`);

  if (outcome.quotaStatus === "ok") ok += 1;
  else err += 1;

  if (!apply) continue;

  const patch = {
    quota_snapshot: outcome.snapshot,
    quota_checked_at: new Date().toISOString(),
    quota_status: outcome.quotaStatus,
    updated_at: new Date().toISOString(),
  };
  if (outcome.snapshot.planLabel && !row.plan_package) patch.plan_package = outcome.snapshot.planLabel;
  if (outcome.snapshot.tierLabel && !row.plan_tier) patch.plan_tier = outcome.snapshot.tierLabel;
  if (parsedPlan.planExpiresAt) patch.plan_expires_at = parsedPlan.planExpiresAt;
  if (parsedPlan.planPackage && !row.plan_package) patch.plan_package = parsedPlan.planPackage;
  if (parsedPlan.planStatus) patch.plan_status = parsedPlan.planStatus;

  await patchRow(token, row.id, patch);
}

console.log(`Done — ok=${ok} other=${err}`);
if (!apply) console.log("Re-run with --apply to persist snapshots");
