#!/usr/bin/env node
/**
 * Apply 2FA vault SQL via Supabase Management API (uses E:\Dev\.env.shared token).
 * Usage: node scripts/apply-twofa-migrations-api.mjs [projectRef]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const projectRef = process.argv[2] || "zurfouqanjcubgneuctp";
const sqlFile = path.join(root, "supabase-twofa/migrations/20260603100000_twofa_accounts.sql");

const sql = fs.readFileSync(sqlFile, "utf8");
console.log(`Applying 2FA migration to ${projectRef}…`);
await runMgmtDbQuery(projectRef, sql);
console.log("OK — twofa_accounts + RLS");
