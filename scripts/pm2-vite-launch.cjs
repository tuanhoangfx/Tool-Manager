#!/usr/bin/env node
/** PM2 entry: free port then start Vite — avoids port-collision restart loops. */
const path = require("node:path");
const { spawn } = require("node:child_process");
const { findViteBin, killPorts } = require("../../scripts/lib/ensure-dev-core.cjs");
const { resolveNodeExe } = require("../../scripts/lib/win-shell-env.cjs");

const root = path.resolve(__dirname, "..");
const PORT = 5177;
const viteBin = findViteBin(root);

if (!viteBin) {
  console.error("[p0020-dev] vite bin not found — run pnpm install at repo root");
  process.exit(1);
}

killPorts(PORT);

const child = spawn(
  resolveNodeExe(),
  [viteBin, "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: root, stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
