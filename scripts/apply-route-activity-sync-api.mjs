#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260604130000_cookie_route_user_sync.sql"),
  "utf8",
);

console.log(`Applying cookie_route_user_sync to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — per-user Sync/Load activity");
