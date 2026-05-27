/**
 * Apply APPLY_FIX_V_NOTE_DROP.sql (postgres).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { loadP0020Env, resolveSupabaseDbUrl, supabaseDbUrlHint } from "./load-p0020-env.mjs";

const { root, env, manifest } = loadP0020Env();
const dbUrl = resolveSupabaseDbUrl({ env, manifest });
if (!dbUrl) {
  const { template, note } = supabaseDbUrlHint(manifest);
  console.error("Missing SUPABASE_DB_URL. Template:", template);
  console.error(note);
  process.exit(1);
}

const sql = readFileSync(resolve(root, "supabase/APPLY_FIX_V_NOTE_DROP.sql"), "utf8");
const pg = await import("pg");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("APPLY_FIX_V_NOTE_DROP.sql OK");
} finally {
  await client.end();
}
