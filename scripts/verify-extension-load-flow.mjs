/**
 * Smoke check for Load cookies prerequisites (DB + RPC).
 * Real apply needs Chrome extension v0.5.4+ on a logged-in facebook tab.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const writeProbe = args.includes("--write-probe");
const noteId = args.find((a) => a && !a.startsWith("-"))?.trim();
if (!noteId) {
  console.log("Usage: node scripts/verify-extension-load-flow.mjs <note-uuid> [--write-probe]");
  console.log("Default: read-only vault fetch. --write-probe runs upsert (overwrites vault — dev only).");
  process.exit(1);
}

if (writeProbe) {
  const upsert = await fetch(`${url}/rest/v1/rpc/note_vault_upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_note_id: noteId,
      p_domain: ".facebook.com",
      p_pass: null,
      p_ciphertext: "dGVzdA==",
      p_iv: "dGVzdA==",
      p_cookie_count: 1,
    }),
  });
  const upsertBody = await upsert.text();
  console.log("vault upsert probe", upsert.status, upsertBody.slice(0, 120));
  if (/record\s+"v_note"|sync_pass_hash/i.test(upsertBody)) {
    console.error("\nFAIL: stale DB functions — docs/SUPABASE-P0020.md (pnpm generate:apply-all)");
    process.exit(2);
  }
}

const fetchRes = await fetch(`${url}/rest/v1/rpc/note_vault_fetch`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    p_note_id: noteId,
    p_domain: ".facebook.com",
    p_pass: null,
  }),
});
const fetchBody = await fetchRes.text();
console.log("vault fetch", fetchRes.status, fetchBody.slice(0, 200));

if (/record\s+"v_note"|sync_pass_hash/i.test(fetchBody)) {
  console.error("\nFAIL: stale DB functions — run APPLY_FIX_V_NOTE_DROP.sql");
  process.exit(2);
}
if (fetchRes.ok) {
  try {
    const row = JSON.parse(fetchBody);
    if (row.ok) {
      console.log("\nOK: vault exists for note — extension Load should decrypt + chrome.cookies.set");
      console.log("  → Reload extension 0.5.4, open facebook.com, Load cookies, F5");
      process.exit(0);
    }
    console.log("\nNo vault row yet — Sync now on source browser first.");
  } catch {
    /* ignore */
  }
}
console.log("\nDone (see status above).");
