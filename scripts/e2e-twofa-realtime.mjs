#!/usr/bin/env node
/**
 * E2E: 2FA vault cloud insert + reconcile count (realtime propagation contract).
 *
 * Usage:
 *   node scripts/e2e-twofa-realtime.mjs [email] [password]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const url = process.env.VITE_TWOFA_SUPABASE_URL;
const key = process.env.VITE_TWOFA_SUPABASE_ANON_KEY;
const email = process.argv[2] ?? "czpgo@outlook.com";
const password = process.argv[3] ?? "123123";

if (!url || !key) {
  console.error("FAIL: missing VITE_TWOFA_SUPABASE_* in .env.local");
  process.exit(2);
}

console.log(`E2E 2FA realtime reconcile on ${url}…`);

async function signIn() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const auth = await res.json();
  if (!auth.access_token) {
    console.error("AUTH_FAIL", auth);
    process.exit(2);
  }
  return auth;
}

async function countActive(userId, token) {
  const res = await fetch(
    `${url}/rest/v1/twofa_accounts?select=id&user_id=eq.${userId}&deleted_at=is.null`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        Prefer: "count=exact",
      },
    },
  );
  const range = res.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  if (!match) {
    const rows = await res.json();
    if (!res.ok) {
      console.error("COUNT_FAIL", rows);
      process.exit(3);
    }
    return Array.isArray(rows) ? rows.length : 0;
  }
  return Number(match[1]);
}

const auth = await signIn();
const userId = auth.user.id;
const token = auth.access_token;
console.log("OK: auth", email);

const before = await countActive(userId, token);
console.log("OK: active count before", before);

const svc = `E2E-Realtime-${Date.now()}`;
const now = new Date().toISOString();
const rowId = crypto.randomUUID();
const insert = await fetch(`${url}/rest/v1/twofa_accounts`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    id: rowId,
    user_id: userId,
    service: svc,
    browser: null,
    account: "e2e-realtime@test.local",
    password: null,
    secret: "JBSWY3DPEHPK3PXP",
    created_at: now,
    updated_at: now,
    last_used_at: null,
  }),
});
const inserted = await insert.json();
if (!insert.ok) {
  console.error("INSERT_FAIL", inserted);
  process.exit(4);
}
console.log("OK: inserted", svc);

const afterInsert = await countActive(userId, token);
if (afterInsert !== before + 1) {
  console.error("FAIL: count after insert", { before, afterInsert });
  process.exit(5);
}
console.log("OK: count after insert", afterInsert);

const tombstone = await fetch(`${url}/rest/v1/twofa_accounts?id=eq.${rowId}`, {
  method: "PATCH",
  headers: {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({ deleted_at: new Date().toISOString() }),
});
if (!tombstone.ok) {
  const err = await tombstone.text();
  console.error("TOMBSTONE_FAIL", err);
  process.exit(6);
}
console.log("OK: tombstoned", rowId);

const afterDelete = await countActive(userId, token);
if (afterDelete !== before) {
  console.error("FAIL: count after tombstone", { before, afterDelete });
  process.exit(7);
}
console.log("OK: count restored", afterDelete);
console.log("E2E passed.");
