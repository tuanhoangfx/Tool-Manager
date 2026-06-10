#!/usr/bin/env node
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const projectRef = "bklxcjrkhrevdcqjscku";

const orphanProfiles = await runMgmtDbQuery(
  projectRef,
  `SELECT p.id, p.email FROM public.profiles p
   LEFT JOIN auth.users u ON u.id = p.id
   WHERE u.id IS NULL LIMIT 10`,
);

const missingProfiles = await runMgmtDbQuery(
  projectRef,
  `SELECT u.id, u.email FROM auth.users u
   LEFT JOIN public.profiles p ON p.id = u.id
   WHERE p.id IS NULL LIMIT 10`,
);

console.log("profiles without auth.users:", orphanProfiles);
console.log("auth.users without profiles:", missingProfiles);

const triggers = await runMgmtDbQuery(
  projectRef,
  `SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created'`,
);
console.log("trigger:", triggers);
