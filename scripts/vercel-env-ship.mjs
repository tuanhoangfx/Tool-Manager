#!/usr/bin/env node
/**
 * P0020: sync Vercel env from .env.local → deploy hook → wait for TWOFA anon in bundle.
 *
 * Usage: node scripts/vercel-env-ship.mjs [--skip-sync] [--skip-wait]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { triggerDeployHook } from "../../scripts/lib/vercel-cli-lib.mjs";

const require = createRequire(import.meta.url);
const { readJson } = require("../../scripts/lib/version-sync-lib.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const skipSync = process.argv.includes("--skip-sync");
const skipWait = process.argv.includes("--skip-wait");

function run(script, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!skipSync) {
  console.log("==> sync Vercel env (API upsert)");
  run(path.join(root, "scripts/sync-p0020-vercel-env-api.mjs"));
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

if (!skipWait) {
  console.log("==> wait for TWOFA anon key in production bundle");
  run(path.join(root, "scripts/wait-prod-twofa-anon-key.mjs"), ["--origin", manifest.urls?.app || ""]);
}

console.log("vercel-env-ship: complete");
