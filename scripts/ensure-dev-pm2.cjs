#!/usr/bin/env node
/**
 * Start P0020 via PM2 when available; fallback to detached Vite ensure-dev.
 * Usage: node scripts/ensure-dev-pm2.cjs [--open] [--force]
 */
const { execSync } = require("node:child_process");
const path = require("node:path");
const { findPm2Bin, pm2ExecSync } = require("../../scripts/lib/win-shell-env.cjs");
const { killPorts } = require("../../scripts/lib/ensure-dev-core.cjs");

const root = path.resolve(__dirname, "..");
const open = process.argv.includes("--open");
const force = process.argv.includes("--force");
const PORT = 5177;

function hasPm2() {
  return Boolean(findPm2Bin(root));
}

function pm2Status() {
  try {
    const raw = pm2ExecSync(["jlist"], { encoding: "utf8", cwd: root });
    const apps = JSON.parse(raw);
    const app = apps.find((a) => a.name === "p0020-dev");
    return app?.pm2_env?.status ?? null;
  } catch {
    return null;
  }
}

function startPm2() {
  if (force) {
    killPorts(PORT);
    try {
      pm2ExecSync(["delete", "p0020-dev"], { stdio: "ignore", cwd: root });
    } catch {
      /* not running */
    }
  }
  const status = pm2Status();
  if (status === "online" && !force) {
    console.log("[P0020] PM2 process p0020-dev is already online.");
    return;
  }
  if (status && status !== "online") {
    console.log("[P0020] Restarting PM2 process p0020-dev…");
    killPorts(PORT);
    pm2ExecSync(["restart", "p0020-dev"], { stdio: "inherit", cwd: root });
  } else if (!status) {
    console.log("[P0020] Starting PM2 process p0020-dev (background)…");
    killPorts(PORT);
    pm2ExecSync(["start", "ecosystem.config.cjs"], { stdio: "inherit", cwd: root });
  }
  try {
    pm2ExecSync(["save"], { stdio: "ignore", cwd: root });
  } catch {
    /* optional */
  }
}

function main() {
  if (hasPm2()) {
    startPm2();
    const flags = [open && "--open", force && "--force"].filter(Boolean).join(" ");
    execSync(`node "${path.join(__dirname, "ensure-dev-vite.cjs")}" ${flags}`.trim(), {
      cwd: root,
      stdio: "inherit",
    });
    return;
  }
  console.log("[P0020] PM2 not found — fallback to detached Vite.");
  const flags = [open && "--open", force && "--force"].filter(Boolean).join(" ");
  execSync(`node "${path.join(__dirname, "ensure-dev.cjs")}" ${flags}`.trim(), {
    cwd: root,
    stdio: "inherit",
  });
}

main();
