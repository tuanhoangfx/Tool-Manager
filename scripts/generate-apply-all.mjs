#!/usr/bin/env node
/**
 * Generate supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql from supabase/migrations/*.sql
 * Source of truth: migrations only (do not edit APPLY_ALL by hand).
 *
 * Usage:
 *   node scripts/generate-apply-all.mjs          # write file
 *   node scripts/generate-apply-all.mjs --check  # exit 1 if out of date (CI)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase", "migrations");
const outPath = join(root, "supabase", "APPLY_ALL_P0020_COOKIE_BRIDGE.sql");
const checkOnly = process.argv.includes("--check");

const files = readdirSync(migDir)
  .filter((n) => /^\d{14}_.+\.sql$/i.test(n))
  .sort();

if (!files.length) {
  console.error("No timestamped migrations in supabase/migrations/");
  process.exit(1);
}

const header = `-- =============================================================================
-- GENERATED — do not edit by hand
-- Source: supabase/migrations/*.sql (sorted by timestamp)
-- Regenerate: pnpm generate:apply-all
-- Dashboard: paste this file in Supabase SQL Editor → Run
-- CLI alternative: supabase db push
-- Generated at: ${new Date().toISOString()}
-- Files: ${files.join(", ")}
-- =============================================================================

create extension if not exists pgcrypto;

`;

const body = files
  .map((name) => {
    const sql = readFileSync(join(migDir, name), "utf8").trim();
    return `-- ---------- ${name} ----------\n\n${sql}\n`;
  })
  .join("\n");

const footer = `
-- ---------- reload PostgREST schema ----------
notify pgrst, 'reload schema';
`;

const output = header + body + footer;

if (checkOnly) {
  let existing = "";
  try {
    existing = readFileSync(outPath, "utf8");
  } catch {
    console.error("APPLY_ALL missing — run pnpm generate:apply-all");
    process.exit(1);
  }
  const norm = (s) => s.replace(/^-- Generated at:.*$/m, "-- Generated at: …").trim();
  if (norm(existing) !== norm(output)) {
    console.error("APPLY_ALL_P0020_COOKIE_BRIDGE.sql is out of date — run pnpm generate:apply-all");
    process.exit(1);
  }
  console.log("APPLY_ALL is up to date with migrations");
  process.exit(0);
}

writeFileSync(outPath, output, "utf8");
console.log(`Wrote ${outPath} (${files.length} migrations)`);
