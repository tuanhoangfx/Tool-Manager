/**
 * Verify note_cookie_vault + RPC exist (reads .env.local).
 * Usage: node scripts/verify-vault-v4.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const out = {};
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* ignore */
  }
  return out;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };

async function checkTable() {
  const res = await fetch(`${url}/rest/v1/note_cookie_vault?select=note_id&limit=1`, { headers });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function checkRpc(name, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await res.text();
  const exists = !/does not exist|PGRST202|42883/i.test(responseBody);
  return { ok: exists, status: res.status, body: responseBody.slice(0, 200) };
}

const table = await checkTable();
const upsert = await checkRpc("note_vault_upsert", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
  p_domain: ".test",
  p_pass: null,
  p_ciphertext: "dGVzdA==",
  p_iv: "dGVzdA==",
  p_cookie_count: 0,
  p_source_browser: "vault-check",
  p_updated_by: "vault-check",
});
const fetchRpc = await checkRpc("note_vault_fetch", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
  p_domain: ".test",
  p_pass: null,
});

console.log("note_cookie_vault table:", table.ok ? "OK" : `MISSING (${table.status})`);
if (!table.ok) console.log("  ", table.body.slice(0, 120));

console.log("note_vault_upsert RPC:", upsert.ok ? "OK" : `MISSING (${upsert.status})`);
if (!upsert.ok) console.log("  ", upsert.body);

console.log("note_vault_fetch RPC:", fetchRpc.ok ? "OK" : `MISSING (${fetchRpc.status})`);
if (!fetchRpc.ok) console.log("  ", fetchRpc.body);

process.exit(table.ok && upsert.ok && fetchRpc.ok ? 0 : 2);
