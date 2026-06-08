#!/usr/bin/env node
/** Verify cookie share + vault sync_status migration on Data Box Supabase. */
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";

const checks = [
  {
    name: "note_cookie_normalize_grantee_email",
    sql: `select proname from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'note_cookie_normalize_grantee_email'`,
  },
  {
    name: "vault_sync_status_bump",
    sql: `select pg_get_functiondef(p.oid) as def
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'note_vault_upsert_v2'`,
  },
];

console.log(`Verifying cookie share/vault migration on ${projectRef}…`);

for (const check of checks) {
  const rows = await runMgmtDbQuery(projectRef, check.sql);
  if (check.name === "note_cookie_normalize_grantee_email") {
    if (!rows?.length) {
      console.error("MISSING:", check.name);
      process.exit(1);
    }
    console.log("OK:", check.name);
    continue;
  }
  const def = rows?.[0]?.def ?? "";
  if (!def.includes("sync_status = 'synced'")) {
    console.error("MISSING: note_vault_upsert_v2 sync_status bump");
    process.exit(1);
  }
  console.log("OK: note_vault_upsert_v2 sets sync_status on vault promote");
}

const bare = await runMgmtDbQuery(
  projectRef,
  `select count(*)::int as bare_grantee_emails
   from public.note_cookie_members
   where grantee_email is not null and position('@' in grantee_email) = 0`,
);
console.log("Bare grantee emails remaining:", bare?.[0]?.bare_grantee_emails ?? "?");
console.log("All checks passed.");
