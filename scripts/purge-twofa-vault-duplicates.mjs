#!/usr/bin/env node
/**
 * One-shot: tombstone duplicate 2FA vault rows (cloud) — vault identity + dedupe key.
 *
 * Usage:
 *   node scripts/purge-twofa-vault-duplicates.mjs --dry-run [email] [password]
 *   node scripts/purge-twofa-vault-duplicates.mjs --apply [email] [password]
 *
 * After --apply: open P0020 2FA tab once (in-app migration cleans localStorage ghosts).
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { planTwofaVaultPurge } from "./lib/twofa-vault-dedupe.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedEnv = resolve(root, "../../.env.shared");
const localEnv = resolve(root, ".env.local");

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

loadEnvFile(sharedEnv);
loadEnvFile(localEnv);

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = args.includes("--dry-run") || !apply;
const positional = args.filter((a) => !a.startsWith("--"));
const email = positional[0] ?? "czpgo@outlook.com";
const password = positional[1] ?? "123123";

const url = process.env.VITE_TWOFA_SUPABASE_URL;
const key = process.env.VITE_TWOFA_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("FAIL: missing VITE_TWOFA_SUPABASE_* in .env.local");
  process.exit(2);
}

const SELECT =
  "id,service,browser,account,secret,updated_at,deleted_at";

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const auth = await res.json();
  if (!auth.access_token) {
    console.error("AUTH_FAIL", auth.error_description ?? auth);
    process.exit(2);
  }
  return auth;
}

async function fetchActiveRows(userId, token) {
  const rows = [];
  const pageSize = 500;
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const res = await fetch(
      `${url}/rest/v1/twofa_accounts?select=${SELECT}&user_id=eq.${userId}&deleted_at=is.null&order=updated_at.desc&offset=${from}&limit=${pageSize}`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } },
    );
    const chunk = await res.json();
    if (!res.ok) {
      console.error("QUERY_FAIL", chunk);
      process.exit(3);
    }
    if (!chunk.length) break;
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function tombstoneRow(id, token) {
  const now = new Date().toISOString();
  const res = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ deleted_at: now }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`tombstone ${id}: ${res.status} ${err}`);
  }
}

function printPlan(plan) {
  console.log(`\nVault purge plan (${dryRun ? "DRY RUN" : "APPLY"})`);
  console.log(`  Active rows before: ${plan.before}`);
  console.log(`  Rows to tombstone:  ${plan.removedIds.length}`);
  console.log(`  Active rows after:  ${plan.after}`);

  if (!plan.serviceCounts.length) {
    console.log("\n  No duplicates found.");
    return;
  }

  console.log("\n  By service:");
  for (const { service, count, rows } of plan.serviceCounts) {
    console.log(`    ${service}: ${count} duplicate(s)`);
    for (const row of rows) {
      const secretHint = row.secret ? "has-secret" : "no-secret";
      console.log(
        `      - ${row.id.slice(0, 8)}… account=${row.account || "—"} ${secretHint} updated=${row.updatedAt}`,
      );
    }
  }

  if (plan.vaultGroups.length) {
    console.log("\n  Vault identity merges (e.g. secret-key vs service-account split):");
    for (const { winner, removed } of plan.vaultGroups) {
      console.log(
        `    keep ${winner.id.slice(0, 8)}… (${winner.service}|${winner.account}) secret=${winner.secret ? "yes" : "no"}`,
      );
      for (const row of removed) {
        console.log(`      drop ${row.id.slice(0, 8)}… secret=${row.secret ? "yes" : "no"}`);
      }
    }
  }
}

console.log(`2FA vault duplicate purge — ${dryRun ? "dry-run" : "apply"} on ${url}`);
const auth = await signIn();
console.log("AUTH_OK", { id: auth.user?.id, email: auth.user?.email });

const rows = await fetchActiveRows(auth.user.id, auth.access_token);
const plan = planTwofaVaultPurge(rows);
printPlan(plan);

if (!plan.removedIds.length) {
  console.log("\nOK — nothing to purge.");
  process.exit(0);
}

if (dryRun) {
  console.log("\nRe-run with --apply to tombstone duplicates on cloud.");
  console.log("Then open P0020 → 2FA tab once to run local migration.");
  process.exit(0);
}

console.log("\nTombstoning…");
let done = 0;
for (const id of plan.removedIds) {
  await tombstoneRow(id, auth.access_token);
  done += 1;
  process.stdout.write(`  ${done}/${plan.removedIds.length}\r`);
}
console.log(`\nOK — tombstoned ${done} row(s). Open P0020 2FA tab to sync local cache.`);
