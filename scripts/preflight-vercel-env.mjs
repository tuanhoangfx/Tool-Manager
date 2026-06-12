#!/usr/bin/env node
/**
 * Preflight before Vercel env sync / deploy hook — requiredKeys must exist in .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { readJson } = require("../../scripts/lib/version-sync-lib.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

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

const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
const requiredKeys = manifest.vercelEnvValidation?.requiredKeys || [];
if (!requiredKeys.length) {
  console.log("preflight-vercel-env: skip (no requiredKeys)");
  process.exit(0);
}

if (!fs.existsSync(envPath)) {
  console.error(`preflight-vercel-env: missing ${envPath}`);
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const missing = requiredKeys.filter((k) => !env[k]?.trim());
if (missing.length) {
  console.error("preflight-vercel-env: missing keys in .env.local:");
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}

console.log(`preflight-vercel-env: OK (${requiredKeys.length} keys)`);
