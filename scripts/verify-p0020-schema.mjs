/**
 * Full P0020 cookie bridge schema check (reads .env.local).
 * Usage: node scripts/verify-p0020-schema.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const out = {};
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };

async function rpc(name, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

const checks = [];

// notes columns via OpenAPI not easy — infer from vault upsert error
const vaultProbe = await rpc("note_vault_upsert", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
  p_domain: ".test",
  p_pass: null,
  p_ciphertext: "dGVzdA==",
  p_iv: "dGVzdA==",
  p_cookie_count: 0,
});

const staleVNote = /record\s+"v_note"\s+has\s+no\s+field/i.test(vaultProbe.body);
const missingPassCol = /sync_pass_hash/i.test(vaultProbe.body) && !staleVNote;
checks.push({
  name: "vault RPC (no stale v_note / sync_pass_hash bug)",
  ok: !staleVNote && !missingPassCol,
  detail: staleVNote
    ? "OLD DB functions — run pnpm generate:apply-all + SQL Editor (docs/SUPABASE-P0020.md)"
    : missingPassCol
      ? vaultProbe.body.slice(0, 160)
      : vaultProbe.body.slice(0, 60) || "ok",
});

// Real note row hits sync_pass_hash path (fake uuid stops at "note not found" too early)
const notesRes = await fetch(`${url}/rest/v1/notes?select=id&limit=1`, { headers });
let realNoteId = null;
if (notesRes.ok) {
  try {
    const rows = await notesRes.json();
    realNoteId = rows?.[0]?.id ?? null;
  } catch {
    /* ignore */
  }
}
if (realNoteId) {
  const realVault = await rpc("note_vault_upsert", {
    p_note_id: realNoteId,
    p_domain: ".probe-schema",
    p_pass: null,
    p_ciphertext: "dGVzdA==",
    p_iv: "dGVzdA==",
    p_cookie_count: 0,
  });
  const realStale = /record\s+"v_note"\s+has\s+no\s+field/i.test(realVault.body);
  checks.push({
    name: "note_vault_upsert on real note (authenticated)",
    ok: !realStale && !/sync_pass_hash/i.test(realVault.body),
    detail: `${realVault.status} ${realVault.body.slice(0, 100)}`,
  });
}

const syncByNote = await rpc("note_sync_cookies_by_note_id", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
  p_pass: null,
  p_snapshot: [],
  p_domain: ".test",
});
checks.push({
  name: "note_sync_cookies_by_note_id RPC",
  ok: !/does not exist|PGRST202/i.test(syncByNote.body),
  detail: `${syncByNote.status} ${syncByNote.body.slice(0, 80)}`,
});

const setPass = await rpc("note_set_sync_pass", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
  p_pass: null,
});
checks.push({
  name: "note_set_sync_pass RPC",
  ok: !/does not exist|PGRST202/i.test(setPass.body),
  detail: `${setPass.status} ${setPass.body.slice(0, 80)}`,
});

const tableRes = await fetch(`${url}/rest/v1/note_cookie_vault?select=note_id&limit=1`, { headers });
checks.push({
  name: "note_cookie_vault table",
  ok: tableRes.ok,
  detail: String(tableRes.status),
});

console.log("\nP0020 Supabase schema check\n");
for (const c of checks) {
  console.log(`${c.ok ? "OK " : "FAIL"} ${c.name}`);
  if (!c.ok) console.log(`     ${c.detail}\n`);
}

const allOk = checks.every((c) => c.ok);
if (!allOk) {
  console.log("Fix: pnpm generate:apply-all → paste APPLY_ALL in SQL Editor (docs/SUPABASE-P0020.md).\n");
}
process.exit(allOk ? 0 : 2);
