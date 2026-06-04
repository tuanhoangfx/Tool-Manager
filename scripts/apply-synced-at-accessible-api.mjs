#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260604230000_cookie_synced_at_accessible_members.sql"),
  "utf8",
);

console.log(`Applying note_cookie_synced_at_for_accessible to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — members can read route synced_at");
