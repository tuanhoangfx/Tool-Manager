#!/usr/bin/env node
/**
 * Push P0020 VITE_* env from .env.local to Vercel via REST API (upsert).
 * Token: VERCEL_TOKEN env, E:\Dev\.env.shared, or ~/.local/share/com.vercel.cli/auth.json
 *
 * Usage: node scripts/sync-p0020-vercel-env-api.mjs [--all-envs]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadVercelToken } from "../../scripts/lib/vercel-cli-lib.mjs";
import { upsertProjectEnv } from "../../scripts/lib/vercel-env-upsert.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
const allEnvs = process.argv.includes("--all-envs");
const targets = allEnvs
  ? ["production", "preview", "development"]
  : ["production", "preview", "development"];

const KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_HUB_SUPABASE_URL",
  "VITE_HUB_SUPABASE_ANON_KEY",
  "VITE_TWOFA_SUPABASE_URL",
  "VITE_TWOFA_SUPABASE_ANON_KEY",
  "VITE_CHATCENTER_WORKER_URL",
  "VITE_HUB_ADMIN_RECOVER_TOKEN",
];

const PROJECT_ID = "prj_sYleHL1YghcKIi3JfB8P98TPOK5a";
const TEAM_SLUG = process.env.VERCEL_TEAM_ID || "team_OJYy4qksQu1vUUw1xNQh9ZHj";

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = val;
  }
  return out;
}

function loadTokenFromVercelAuthFile() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [
    path.join(home, ".local", "share", "com.vercel.cli", "auth.json"),
    path.join(process.env.APPDATA || "", "com.vercel.cli", "auth.json"),
    path.join(process.env.LOCALAPPDATA || "", "com.vercel.cli", "auth.json"),
  ];
  for (const file of candidates) {
    try {
      if (!file || !fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      const token = raw.token || raw.credentials?.token;
      if (token) return token;
    } catch {
      /* ignore */
    }
  }
  return "";
}

const token = loadVercelToken(root) || loadTokenFromVercelAuthFile();
if (!token) {
  console.error("Missing VERCEL_TOKEN — add to E:\\Dev\\.env.shared or run `vercel login`");
  console.error("Create token: https://vercel.com/account/tokens");
  process.exit(1);
}
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}`);
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const missing = KEYS.filter((k) => !env[k]);
if (missing.length) {
  console.error("Missing keys in .env.local:", missing.join(", "));
  process.exit(1);
}

let failed = 0;
for (const key of KEYS) {
  try {
    const r = await upsertProjectEnv({
      projectId: PROJECT_ID,
      teamSlug: TEAM_SLUG,
      token,
      key,
      value: env[key],
      targets,
    });
    console.log(`${r.action === "patch" ? "PATCH" : "POST"} ${key} → ${targets.join(", ")}`);
  } catch (e) {
    console.error(`FAIL ${key}:`, e instanceof Error ? e.message : e);
    failed++;
  }
}

process.exit(failed ? 1 : 0);
