#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260604120000_cookie_route_user_activity.sql"),
  "utf8",
);

console.log(`Applying cookie_route_user_activity to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — cookie_route_record_load / cookie_route_activity_list");
