#!/usr/bin/env node
/**
 * Apply P0020 Data Box SQL migrations via Supabase Management API (no DB password required).
 * Usage: node scripts/apply-databox-migrations-api.mjs [projectRef]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const projectRef = process.argv[2] || "bklxcjrkhrevdcqjscku";

const migrationsDir = path.join(root, "supabase/migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => /^\d{14}_.+\.sql$/i.test(f))
  .sort();

console.log(`Applying ${files.length} Data Box migrations to ${projectRef}…\n`);

let failed = 0;
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  process.stdout.write(`  ${file} … `);
  try {
    await runMgmtDbQuery(projectRef, sql);
    console.log("OK");
  } catch (e) {
    failed++;
    console.log("FAIL");
    console.error(`    ${e instanceof Error ? e.message : e}\n`);
  }
}

if (failed) {
  console.error(`${failed} migration(s) failed.`);
  process.exit(1);
}

console.log("\nData Box migrations done. Next: pnpm verify:cookie");
