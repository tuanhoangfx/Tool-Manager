import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadP0020Env() {
  const out = {};
  const envPath = resolve(root, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  const manifestPath = resolve(root, "tool.manifest.json");
  let manifest = {};
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  }
  return { root, env: out, manifest };
}

export function resolveSupabaseDbUrl({ env, manifest }) {
  const fromEnv = env.SUPABASE_DB_URL || env.DATABASE_URL;
  if (fromEnv && !fromEnv.includes("[DB_PASSWORD]")) return fromEnv;
  const fromManifest = manifest?.supabase?.localEnv?.SUPABASE_DB_URL;
  if (fromManifest && !fromManifest.includes("[DB_PASSWORD]")) return fromManifest;
  return null;
}

export function supabaseDbUrlHint(manifest) {
  const template =
    manifest?.supabase?.localEnv?.SUPABASE_DB_URL ??
    "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres";
  const note = manifest?.supabase?.localEnv?.note ?? "See tool.manifest.json → supabase.localEnv";
  return { template, note };
}
