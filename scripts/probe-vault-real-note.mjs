/**
 * Probe vault upsert with a real note UUID (catches stale v_note bug).
 * Usage: node scripts/probe-vault-real-note.mjs <note-uuid>
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const noteId = process.argv[2]?.trim();
if (!noteId) {
  console.error("Usage: node scripts/probe-vault-real-note.mjs <note-uuid>");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const res = await fetch(`${url}/rest/v1/rpc/note_vault_upsert`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    p_note_id: noteId,
    p_domain: ".facebook.com",
    p_pass: null,
    p_ciphertext: "dGVzdA==",
    p_iv: "dGVzdA==",
    p_cookie_count: 1,
  }),
});
const body = await res.text();
console.log("status", res.status);
console.log(body);
if (/record\s+"v_note"|sync_pass_hash/i.test(body)) process.exit(2);
if (res.ok || /note not found|invalid pass/i.test(body)) {
  console.log("OK — vault RPC healthy for real note row");
  process.exit(0);
}
process.exit(1);
