/**
 * Apply all P0020 Data Box SQL migrations to the database in SUPABASE_DB_URL.
 * Prerequisite: .env.local with VITE_SUPABASE_* and SUPABASE_DB_URL (real password).
 *
 * Usage: pnpm db:migrate
 */
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { loadP0020Env, resolveSupabaseDbUrl, supabaseDbUrlHint } from "./load-p0020-env.mjs";

const { root, env, manifest } = loadP0020Env();
const dbUrl = resolveSupabaseDbUrl({ env, manifest });
if (!dbUrl) {
  const { template, note } = supabaseDbUrlHint(manifest);
  console.error("Missing SUPABASE_DB_URL in .env.local (Transaction pooler URI, real password).");
  console.error("Template:", template);
  console.error(note);
  console.error("Tip: copy URI from Dashboard → Connect, then: pnpm db:url:clipboard");
  process.exit(1);
}

const migrationsDir = resolve(root, "supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => /^\d{14}_.+\.sql$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error("No migration files in supabase/migrations/");
  process.exit(1);
}

const pg = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log(`Applying ${files.length} migrations to Data Box…\n`);

let failed = false;
for (const file of files) {
  const path = resolve(migrationsDir, file);
  const sql = readFileSync(path, "utf8");
  process.stdout.write(`  ${file} … `);
  try {
    await client.query(sql);
    console.log("OK");
  } catch (err) {
    failed = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log("FAIL");
    console.error(`    ${msg}\n`);
  }
}

await client.end();

if (failed) {
  console.error("Some migrations failed. Fix SQL / partial state, then re-run (use IF NOT EXISTS safe files).");
  process.exit(1);
}

const url = env.VITE_SUPABASE_URL ?? manifest?.supabase?.url ?? "";
console.log("\nAll migrations applied.");
console.log("Next: pnpm verify:cookie");
if (url) console.log("Project:", url);
