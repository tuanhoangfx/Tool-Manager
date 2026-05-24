#!/usr/bin/env node
/** @deprecated Vault V4 is in migrations — use pnpm apply:cookie or apply-all-p0020.mjs */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

console.warn("apply:vault-v4 → apply:cookie (full generated APPLY_ALL)…");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(process.execPath, [resolve(root, "scripts/apply-all-p0020.mjs")], {
  stdio: "inherit",
  cwd: root,
});
process.exit(r.status ?? 1);
