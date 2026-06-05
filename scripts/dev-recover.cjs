#!/usr/bin/env node
/**
 * Recover P0020 dev after [plugin:vite:esbuild] The service is no longer running.
 * Kills :5177, clears Vite cache, restarts via ensure-dev.
 *
 * Usage: node scripts/dev-recover.cjs [--open]
 */
const { execSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const open = process.argv.includes("--open");
const viteCache = path.join(root, "node_modules", ".vite");

function log(msg) {
  console.log(`[P0020 recover] ${msg}`);
}

log("Freeing port 5177…");
execSync(`node "${path.join(__dirname, "kill-port.cjs")}" 5177`, { cwd: root, stdio: "inherit" });

const pidFile = path.join(root, ".dev-vite.pid");
try {
  fs.unlinkSync(pidFile);
} catch {
  /* ignore */
}

if (fs.existsSync(viteCache)) {
  log("Clearing Vite cache (node_modules/.vite)…");
  fs.rmSync(viteCache, { recursive: true, force: true });
}

const args = ["scripts/ensure-dev.cjs"];
if (open) args.push("--open");

const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
