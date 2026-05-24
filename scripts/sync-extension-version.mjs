#!/usr/bin/env node
/** Sync extension manifest version → Tool extensionBuildInfo.ts */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extDir = join(root, "..", "..", "Extension", "P0020-cookie-bridge");
const manifest = JSON.parse(readFileSync(join(extDir, "manifest.json"), "utf8"));
const buildInfo = readFileSync(join(extDir, "build-info.js"), "utf8");
const updatedMatch = buildInfo.match(/updated:\s*"([^"]+)"/);
const updated = updatedMatch?.[1] ?? new Date().toISOString().slice(0, 10);

const out = `/** Keep in sync with Extension/P0020-cookie-bridge manifest + build-info.js — run pnpm sync:extension */
export const EXTENSION_BUILD = {
  version: "${manifest.version}",
  updated: "${updated}",
};
`;

writeFileSync(join(root, "src", "features", "cookie", "extensionBuildInfo.ts"), out);
console.log(`extensionBuildInfo.ts ← manifest v${manifest.version}`);
