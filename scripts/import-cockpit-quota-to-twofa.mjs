#!/usr/bin/env node
/**
 * Import Cockpit quota snapshots + credentials into twofa_accounts.
 * Usage:
 *   node scripts/import-cockpit-quota-to-twofa.mjs [--apply] [--dir=path] [--backup=path.json]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCockpitQuotaPatches, loadCockpitQuotaSources } from "./lib/cockpit-quota-import.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const dataDir = process.argv.find((a) => a.startsWith("--dir="))?.slice(6);
const backupPath = process.argv.find((a) => a.startsWith("--backup="))?.slice(9);

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

async function fetchVault(token) {
  const rows = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/twofa_accounts?select=id,service,account,mail_recover,password,note,plan_package,plan_tier&deleted_at=is.null&order=id.asc&offset=${offset}&limit=500`,
      { headers: { apikey: key, Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const page = await res.json();
    if (!page.length) break;
    rows.push(...page);
    if (page.length < 500) break;
    offset += 500;
  }
  return rows;
}

async function patchRow(token, id, patch) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  if (body.password === undefined) delete body.password;
  const res = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${id} ${res.status}: ${await res.text()}`);
}

async function createVaultRow(token, userId, draft) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const body = {
    id,
    user_id: userId,
    service: draft.service,
    browser: null,
    account: draft.account,
    mail_recover: null,
    password: draft.password ?? null,
    secret: draft.secret ?? "",
    note: draft.note ?? null,
    status: draft.status ?? "active",
    ownership: draft.ownership ?? "undefined",
    plan_package: draft.plan_package ?? null,
    plan_tier: draft.plan_tier ?? null,
    quota_snapshot: draft.quota_snapshot ?? null,
    quota_checked_at: draft.quota_checked_at ?? null,
    quota_status: draft.quota_status ?? null,
    log: [],
    created_at: now,
    updated_at: now,
    last_used_at: null,
  };
  const res = await fetch(`${url}/rest/v1/twofa_accounts`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create ${draft.account} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const row = await res.json();
  return Array.isArray(row) ? row[0] : row;
}

const cockpitAccounts = loadCockpitQuotaSources({ dataDir, backupPath });
console.log(`Loaded ${cockpitAccounts.length} Cockpit Cursor/Gemini account(s)`);

const token = await signIn();
const vaultRows = await fetchVault(token);
const { patches, creates, unmatched } = buildCockpitQuotaPatches(vaultRows, cockpitAccounts);

console.log(
  `Patch ${patches.length}, create ${creates.length}, skipped ${unmatched.length}${apply ? " — applying" : " — dry-run"}`,
);
for (const mapped of cockpitAccounts) {
  const top = mapped.quotaSnapshot?.metrics?.[0];
  const summary = top ? `${top.label} ${top.used}%` : mapped.quotaStatus;
  console.log(`  · ${mapped.cockpitPlatform} ${mapped.email} — ${summary}`);
}

if (apply) {
  for (const patch of patches) {
    const { id, ...body } = patch;
    await patchRow(token, id, body);
  }
  const auth = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const userId = auth?.id;
  for (const draft of creates) {
    await createVaultRow(token, userId, draft);
  }
}

console.log("Done");
