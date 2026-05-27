/**
 * Smoke: vault RPC reachable (note not found is OK).
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim().match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const noteId = "00000000-0000-0000-0000-000000000000";
const res = await fetch(`${url}/rest/v1/rpc/note_vault_fetch`, {
  method: "POST",
  headers,
  body: JSON.stringify({ p_note_id: noteId, p_domain: ".test", p_pass: null }),
});
const body = await res.text();
const rpcReachable = res.status !== 404 && !/PGRST202|does not exist/i.test(body);
console.log("note_vault_fetch reachable:", rpcReachable ? "OK" : "FAIL", res.status);
if (!rpcReachable) {
  console.log(body.slice(0, 200));
  process.exit(2);
}
console.log("response snippet:", body.slice(0, 120));
process.exit(0);
