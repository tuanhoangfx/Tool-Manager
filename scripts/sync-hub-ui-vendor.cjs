#!/usr/bin/env node
/** Sync P0020 vendor/hub-ui from P0004 + packages/hub-ui (CSS + shell). */
const { execSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const vendor = path.join(root, "vendor", "hub-ui");
const toolScript = path.resolve(root, "..", "scripts", "sync-hub-ui-vendor.cjs");

execSync(`node "${toolScript}" --only-target --target "${vendor}"`, {
  stdio: "inherit",
  cwd: root,
});
