/**
 * Apply APPLY_ALL_P0020_COOKIE_BRIDGE.sql via postgres.
 * SUPABASE_DB_URL: .env.local or tool.manifest.json → supabase.localEnv (replace [DB_PASSWORD]).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { loadP0020Env, resolveSupabaseDbUrl, supabaseDbUrlHint } from "./load-p0020-env.mjs";

const { root, env, manifest } = loadP0020Env();
const dbUrl = resolveSupabaseDbUrl({ env, manifest });
if (!dbUrl) {
  const { template, note } = supabaseDbUrlHint(manifest);
  console.error("Missing SUPABASE_DB_URL (real password, not [DB_PASSWORD]).");
  console.error("Template:", template);
  console.error(note);
  console.error("Or run SQL in:", manifest?.supabase?.sqlEditor ?? "Supabase SQL Editor");
  process.exit(1);
}

const sql = readFileSync(resolve(root, "supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql"), "utf8");
const pg = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("APPLY_ALL_P0020_COOKIE_BRIDGE.sql OK");
} finally {
  await client.end();
}
