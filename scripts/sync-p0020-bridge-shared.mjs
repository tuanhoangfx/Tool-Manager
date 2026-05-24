#!/usr/bin/env node
/** Copy packages/p0020-bridge/src → Extension/P0020-cookie-bridge/shared */
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "packages", "p0020-bridge", "src");
const destDir = join(root, "..", "..", "Extension", "P0020-cookie-bridge", "shared");

mkdirSync(destDir, { recursive: true });
for (const name of readdirSync(srcDir)) {
  if (!name.endsWith(".js")) continue;
  cpSync(join(srcDir, name), join(destDir, name), { force: true });
}
console.log(`Synced ${srcDir} → ${destDir}`);
