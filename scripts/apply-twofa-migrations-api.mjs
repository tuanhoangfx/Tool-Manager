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
const migrationsDir = path.join(root, "supabase-twofa/migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

console.log(`Applying ${files.length} 2FA migration(s) to ${projectRef}…`);
for (const name of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, name), "utf8");
  console.log(`  → ${name}`);
  await runMgmtDbQuery(projectRef, sql);
}
console.log("OK — twofa_accounts schema + RLS");
