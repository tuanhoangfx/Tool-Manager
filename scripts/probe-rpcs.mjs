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

for (const name of ["note_sync_cookies_by_note_id", "note_set_sync_pass"]) {
  const body =
    name === "note_sync_cookies_by_note_id"
      ? { p_note_id: "00000000-0000-0000-0000-000000000001", p_pass: null, p_snapshot: [], p_domain: ".t" }
      : { p_note_id: "00000000-0000-0000-0000-000000000001", p_pass: null };
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
  console.log(name, res.status, (await res.text()).slice(0, 120));
}
