#!/usr/bin/env node
/**
 * Start P0020 via PM2 when available; fallback to detached Vite ensure-dev.
 * Usage: node scripts/ensure-dev-pm2.cjs [--open] [--force]
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const open = process.argv.includes("--open");
const force = process.argv.includes("--force");
const pm2Bin = path.join(root, "node_modules", "pm2", "bin", "pm2");

function pm2Cmd(args) {
  return `"${process.execPath}" "${pm2Bin}" ${args}`;
}

function hasPm2() {
  return require("node:fs").existsSync(pm2Bin);
}

function pm2Status() {
  try {
    const raw = execSync(pm2Cmd("jlist"), { encoding: "utf8", cwd: root });
    const apps = JSON.parse(raw);
    const app = apps.find((a) => a.name === "p0020-dev");
    return app?.pm2_env?.status ?? null;
  } catch {
    return null;
  }
}

function startPm2() {
  if (force) {
    try {
      execSync(pm2Cmd("delete p0020-dev"), { stdio: "ignore", cwd: root });
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
    execSync(pm2Cmd("restart p0020-dev"), { stdio: "inherit", cwd: root });
  } else if (!status) {
    console.log("[P0020] Starting PM2 process p0020-dev (background)…");
    execSync(pm2Cmd("start ecosystem.config.cjs"), { stdio: "inherit", cwd: root });
  }
  try {
    execSync(pm2Cmd("save"), { stdio: "ignore" });
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
