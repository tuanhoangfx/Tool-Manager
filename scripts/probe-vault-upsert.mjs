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
const headers = { apikey: key, Authorization: `Bearer ${key}` };

const fake = "00000000-0000-0000-0000-000000000001";
const res = await fetch(`${url}/rest/v1/rpc/note_vault_upsert`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    p_note_id: fake,
    p_domain: ".facebook.com",
    p_pass: null,
    p_ciphertext: "YWJj",
    p_iv: "YWJj",
    p_cookie_count: 1,
    p_source_browser: "probe",
  }),
});
console.log("status", res.status);
console.log(await res.text());
