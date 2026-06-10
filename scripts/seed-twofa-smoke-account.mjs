#!/usr/bin/env node
/** Seed one smoke 2FA row for admin account (idempotent by service+account). */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const url = env.VITE_TWOFA_SUPABASE_URL;
const key = env.VITE_TWOFA_SUPABASE_ANON_KEY;
const email = process.argv[2] ?? "czpgo@outlook.com";
const password = process.argv[3] ?? "123123";

const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const auth = await signIn.json();
if (!auth.access_token) {
  console.error("AUTH_FAIL", auth);
  process.exit(2);
}

const userId = auth.user.id;
const now = new Date().toISOString();
const payload = {
  id: crypto.randomUUID(),
  user_id: userId,
  service: "SmokeTest",
  browser: null,
  account: "P0020-sync-verify",
  password: null,
  secret: "JBSWY3DPEHPK3PXP",
  created_at: now,
  updated_at: now,
  last_used_at: null,
};

const existing = await fetch(
  `${url}/rest/v1/twofa_accounts?select=id&user_id=eq.${userId}&service=eq.SmokeTest&account=eq.P0020-sync-verify`,
  { headers: { apikey: key, Authorization: `Bearer ${auth.access_token}` } },
).then((r) => r.json());

if (Array.isArray(existing) && existing.length) {
  console.log("SKIP — smoke row already exists", existing[0].id);
  process.exit(0);
}

const upsert = await fetch(`${url}/rest/v1/twofa_accounts`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify(payload),
});
const row = await upsert.json();
if (!upsert.ok) {
  console.error("UPSERT_FAIL", row);
  process.exit(3);
}
console.log("SEEDED", row[0]?.id ?? row);
