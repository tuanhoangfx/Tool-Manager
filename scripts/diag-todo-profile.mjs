#!/usr/bin/env node
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";
import { loadP0020Env } from "./load-p0020-env.mjs";

const email = process.argv[2] ?? "czpqo@outlook.com";
const projectRef = "bklxcjrkhrevdcqjscku";

const count = await runMgmtDbQuery(projectRef, "SELECT count(*)::int AS n FROM auth.users");
console.log("auth.users count:", count);

const recent = await runMgmtDbQuery(
  projectRef,
  "SELECT email, id FROM auth.users ORDER BY created_at DESC LIMIT 15",
);
console.log("recent auth.users:", recent);

const rows = await runMgmtDbQuery(
  projectRef,
  `SELECT u.id, u.email, p.id AS profile_id, p.role, p.full_name
   FROM auth.users u
   LEFT JOIN public.profiles p ON p.id = u.id
   WHERE u.email ILIKE '%${email.replace(/'/g, "''")}%'
   ORDER BY u.created_at DESC
   LIMIT 5`,
);

console.log("auth.users + profiles for", email, ":", JSON.stringify(rows, null, 2));

const { env } = loadP0020Env();
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Missing VITE_SUPABASE_* in .env.local");
  process.exit(1);
}

const userId = rows?.[0]?.id;
if (!userId) {
  console.log("No auth user found for pattern", email);
  process.exit(0);
}

const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=*`, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: "application/json" },
});
console.log("anon profiles probe:", res.status, await res.text());
