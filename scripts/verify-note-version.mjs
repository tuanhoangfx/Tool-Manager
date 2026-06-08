/**
 * Note version history schema + digest smoke (reads .env.local + mgmt token).
 * Usage: node scripts/verify-note-version.mjs [projectRef]
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

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

function projectRefFromUrl(url) {
  const m = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? null;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const projectRef = process.argv[2] || projectRefFromUrl(url) || "bklxcjrkhrevdcqjscku";
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

// extensions.digest smoke — catches pgcrypto schema mismatch early
try {
  const hashRows = await runMgmtDbQuery(
    projectRef,
    `SELECT note_version_content_hash('verify-smoke', '') AS h`,
  );
  const h = hashRows?.[0]?.h;
  checks.push({
    name: "note_version_content_hash (extensions.digest)",
    ok: typeof h === "string" && h.length === 64,
    detail: h ? `sha256 hex len=${h.length}` : JSON.stringify(hashRows).slice(0, 120),
  });
} catch (err) {
  checks.push({
    name: "note_version_content_hash (extensions.digest)",
    ok: false,
    detail: err instanceof Error ? err.message : String(err),
  });
}

const createVersion = await rpc("note_create_version_if_changed", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
  p_source: "save",
});
checks.push({
  name: "note_create_version_if_changed RPC",
  ok: !/PGRST202|does not exist/i.test(createVersion.body),
  detail: `${createVersion.status} ${createVersion.body.slice(0, 100)}`,
});

const listVersions = await rpc("note_versions_list", {
  p_note_id: "00000000-0000-0000-0000-000000000000",
});
checks.push({
  name: "note_versions_list RPC",
  ok: !/PGRST202|does not exist/i.test(listVersions.body),
  detail: `${listVersions.status} ${listVersions.body.slice(0, 100)}`,
});

const restoreVersion = await rpc("note_version_restore", {
  p_version_id: "00000000-0000-0000-0000-000000000000",
});
checks.push({
  name: "note_version_restore RPC",
  ok: !/PGRST202|does not exist/i.test(restoreVersion.body),
  detail: `${restoreVersion.status} ${restoreVersion.body.slice(0, 100)}`,
});

const deleteVersion = await rpc("note_version_delete", {
  p_version_id: "00000000-0000-0000-0000-000000000000",
});
checks.push({
  name: "note_version_delete RPC",
  ok: !/PGRST202|does not exist/i.test(deleteVersion.body),
  detail: `${deleteVersion.status} ${deleteVersion.body.slice(0, 100)}`,
});

const tableRes = await fetch(`${url}/rest/v1/note_versions?select=id&limit=1`, { headers });
checks.push({
  name: "note_versions table",
  ok: tableRes.ok,
  detail: String(tableRes.status),
});

console.log("\nP0020 note version history check\n");
for (const c of checks) {
  console.log(`${c.ok ? "OK " : "FAIL"} ${c.name}`);
  if (!c.ok) console.log(`     ${c.detail}\n`);
}

const allOk = checks.every((c) => c.ok);
if (!allOk) {
  console.log(
    "Fix: run pnpm db:apply:note-versions && pnpm db:apply:note-version-save && pnpm db:apply:note-version-digest\n",
  );
}
process.exit(allOk ? 0 : 2);
