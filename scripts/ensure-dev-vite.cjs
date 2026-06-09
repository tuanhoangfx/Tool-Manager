#!/usr/bin/env node
/**
 * P0020 Vite ensure — health probe includes JS boot (not HTTP-only).
 */
const path = require("node:path");
const { ensureHubViteDev } = require("../../scripts/lib/ensure-hub-vite-dev.cjs");

const root = path.resolve(__dirname, "..");
const open = process.argv.includes("--open");
const force = process.argv.includes("--force");
const recover = process.argv.includes("--recover");

ensureHubViteDev({
  tag: "P0020",
  root,
  port: 5177,
  probeUrl: "http://127.0.0.1:5177/notes",
  openUrl: "http://127.0.0.1:5177/notes",
  force,
  recover,
  open,
  hubUiBarrelUrl: "http://127.0.0.1:5177/vendor/hub-ui/src/index.ts",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
