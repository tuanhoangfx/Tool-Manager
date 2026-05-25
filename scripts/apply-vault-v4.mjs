/**
 * Apply V4 vault DDL via Supabase SQL (requires SUPABASE_DB_URL or DATABASE_URL in .env.local).
 * Example: postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const out = {};
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* ignore */
  }
  return out;
}

const env = loadEnv();
const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL;
if (!dbUrl) {
  console.error("Add SUPABASE_DB_URL to .env.local (Project Settings → Database → Connection string)");
  process.exit(1);
}

const sql = readFileSync(resolve(root, "supabase/APPLY_VAULT_V4.sql"), "utf8").replace(/^--.*\n/gm, "");

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Install pg: npm i -D pg");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("APPLY_VAULT_V4.sql executed OK");
} finally {
  await client.end();
}
