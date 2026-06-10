/**
 * Smoke: sign in 2FA vault and list twofa_accounts for a user.
 * Usage: node scripts/smoke-twofa-vault.mjs [email] [password]
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const out = {};
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
const url = env.VITE_TWOFA_SUPABASE_URL;
const key = env.VITE_TWOFA_SUPABASE_ANON_KEY;
const email = process.argv[2] ?? "czpgo@outlook.com";
const password = process.argv[3] ?? "123123";

if (!url || !key) {
  console.error("Missing VITE_TWOFA_SUPABASE_* in .env.local");
  process.exit(1);
}

const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const auth = await signIn.json();
if (!auth.access_token) {
  console.error("AUTH_FAIL", auth.error_description ?? auth.msg ?? auth);
  process.exit(2);
}

console.log("AUTH_OK", { id: auth.user?.id, email: auth.user?.email });

const rowsRes = await fetch(`${url}/rest/v1/twofa_accounts?select=id,service,account,updated_at&order=updated_at.desc`, {
  headers: { apikey: key, Authorization: `Bearer ${auth.access_token}` },
});
const rows = await rowsRes.json();
if (!Array.isArray(rows)) {
  console.error("QUERY_FAIL", rows);
  process.exit(3);
}

console.log("TWOFA_COUNT", rows.length);
for (const row of rows.slice(0, 5)) {
  console.log(" ", row.service || "(secret-only)", row.account || "—", row.id.slice(0, 8));
}
