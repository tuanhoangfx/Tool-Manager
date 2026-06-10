#!/usr/bin/env node
/** Confirm 2FA vault auth user email (dev mirror accounts). */
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const projectRef = "zurfouqanjcubgneuctp";
const email = (process.argv[2] ?? "czpgo@outlook.com").trim().toLowerCase();

const sql = `
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = '${email.replace(/'/g, "''")}';
`;

await runMgmtDbQuery(projectRef, sql);
console.log("OK — confirmed", email, "on 2FA vault", projectRef);
