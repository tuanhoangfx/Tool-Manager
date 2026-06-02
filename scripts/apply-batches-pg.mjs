/**
 * Apply browser-batch-*.sql when SUPABASE_DB_URL or DATABOX_DB_PASSWORD is set.
 * Usage:
 *   $env:DATABOX_DB_PASSWORD="your-db-password"
 *   node scripts/apply-batches-pg.mjs
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadP0020Env, resolveSupabaseDbUrl } from "./load-p0020-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ref = process.env.DATABOX_REF || "bklxcjrkhrevdcqjscku";
const region = process.env.DATABOX_REGION || "ap-south-1";
const pwd = process.env.DATABOX_DB_PASSWORD;

const { env, manifest } = loadP0020Env();
let dbUrl = resolveSupabaseDbUrl({ env, manifest });
if (!dbUrl && pwd) {
  dbUrl = `postgresql://postgres.${ref}:${encodeURIComponent(pwd)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}
if (!dbUrl || dbUrl.includes("[DB_PASSWORD]")) {
  console.error("Set SUPABASE_DB_URL in .env.local or DATABOX_DB_PASSWORD env var.");
  process.exit(1);
}

const batches = readdirSync(resolve(root, "supabase"))
  .filter((f) => /^browser-batch-\d+\.sql$/.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!batches.length) {
  console.error("Run: node -e \"...\" to generate supabase/browser-batch-*.sql first");
  process.exit(1);
}

const pg = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const file of batches) {
  const sql = readFileSync(resolve(root, "supabase", file), "utf8");
  process.stdout.write(`${file} … `);
  try {
    await client.query(sql);
    console.log("OK");
  } catch (err) {
    console.log("FAIL");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

await client.end();
console.log("Done.");
