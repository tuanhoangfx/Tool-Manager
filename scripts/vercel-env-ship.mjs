#!/usr/bin/env node
/**
 * P0020: sync Vercel env from .env.local → deploy hook → wait for TWOFA anon in bundle.
 *
 * Usage:
 *   node scripts/vercel-env-ship.mjs
 *   node scripts/vercel-env-ship.mjs --fast          # skip env sync if hash unchanged; 3s poll
 *   node scripts/vercel-env-ship.mjs --skip-sync
 *   node scripts/vercel-env-ship.mjs --skip-wait
 *   node scripts/vercel-env-ship.mjs --skip-version-wait
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { triggerDeployHook } from "../../scripts/lib/vercel-cli-lib.mjs";
import {
  computeVercelEnvHash,
  shouldSkipVercelEnvSync,
  writeStoredVercelEnvHash,
} from "./lib/vercel-env-hash.mjs";

const require = createRequire(import.meta.url);
const { readJson } = require("../../scripts/lib/version-sync-lib.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fast = process.argv.includes("--fast");
let skipSync = process.argv.includes("--skip-sync");
const skipWait = process.argv.includes("--skip-wait");
const skipVersionWait = process.argv.includes("--skip-version-wait");

if (fast) {
  process.env.WAIT_INTERVAL_MS = process.env.WAIT_INTERVAL_MS || "3000";
}

function run(script, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("==> preflight Vercel env (.env.local requiredKeys)");
run(path.join(root, "scripts/preflight-vercel-env.mjs"));

if (!skipSync && fast && shouldSkipVercelEnvSync(root)) {
  console.log("==> skip Vercel env sync (--fast, .env.local hash unchanged)");
  skipSync = true;
}

if (!skipSync) {
  console.log("==> sync Vercel env (API upsert / CLI fallback)");
  run(path.join(root, "scripts/sync-p0020-vercel-env-api.mjs"));
  writeStoredVercelEnvHash(root, computeVercelEnvHash(root));
}

const manifest = readJson(path.join(root, "tool.manifest.json")) || {};
const hookUrl = String(manifest.vercel?.deployHookUrl || "").trim();
if (!hookUrl) {
  console.error("vercel-env-ship: missing vercel.deployHookUrl");
  process.exit(1);
}

console.log("==> trigger production deploy hook");
const hook = await triggerDeployHook(hookUrl);
console.log("deploy hook:", hook.job?.job?.id || hook.job?.id || "ok");

const prodOrigin = manifest.urls?.app || manifest.vercel?.productionUrl || "";

if (!skipWait) {
  console.log("==> wait for TWOFA anon key in production bundle");
  run(path.join(root, "scripts/wait-prod-twofa-anon-key.mjs"), ["--origin", prodOrigin]);
}

if (!skipVersionWait) {
  console.log("==> wait for package.json version in production bundle");
  run(path.join(root, "scripts/wait-prod-app-version.mjs"), ["--origin", prodOrigin]);
}

console.log("==> verify required VITE_* keys in production bundle");
run(path.join(root, "scripts/check-prod-vite-env-bundle.mjs"), ["--origin", prodOrigin]);

console.log("vercel-env-ship: complete");
