#!/usr/bin/env node
/** @deprecated Use pnpm apply:cookie (generated APPLY_ALL from migrations). */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

console.warn("apply:fix-vnote is deprecated — running apply:cookie (APPLY_ALL from migrations)…");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(process.execPath, [resolve(root, "scripts/apply-all-p0020.mjs")], {
  stdio: "inherit",
  cwd: root,
});
process.exit(r.status ?? 1);
