#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..", "..");
const registryPath = path.join(
  workspaceRoot,
  "packages",
  "hub-ui",
  "src",
  "lib",
  "hub-brand-icons.registry.json",
);

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const missing = [];
const corrupt = [];
const MIN_PNG_BYTES = {
  "assets/brand-icons/capcut.png": 800,
  "assets/brand-icons/augment.png": 800,
  "assets/brand-icons/whatsapp.png": 2000,
};
const MIN_ICO_BYTES = { "assets/brand-icons/adobe.ico": 5000 };
let localCount = 0;

for (const entry of registry) {
  if (!entry.src?.startsWith("/assets/brand-icons/")) continue;
  localCount += 1;
  const rel = entry.src.replace(/^\//, "");
  const asset = path.join(projectRoot, "public", rel);
  try {
    await access(asset);
    const min = MIN_PNG_BYTES[rel];
    const minIco = MIN_ICO_BYTES[rel];
    if (min || minIco) {
      const buf = await readFile(asset);
      const isPng = buf[0] === 0x89 && buf[1] === 0x50;
      const isIco = buf[0] === 0x00 && buf[1] === 0x00;
      const floor = min ?? minIco;
      const okFmt = min ? isPng : isIco;
      if (!okFmt || buf.length < floor) {
        corrupt.push({ label: entry.label, asset: entry.src, reason: `bad asset or < ${floor} B` });
      }
    }
  } catch {
    missing.push({ label: entry.label, asset: entry.src });
  }
}

if (missing.length) {
  console.error("Hub brand icon assets missing (run pnpm sync:twofa-icons or sync-hub-brand-icons):");
  for (const row of missing) console.error(`  - ${row.label}: ${row.asset}`);
  process.exit(1);
}

if (corrupt.length) {
  console.error("Hub brand icon assets corrupt:");
  for (const row of corrupt) console.error(`  - ${row.label}: ${row.asset} (${row.reason})`);
  process.exit(1);
}

console.log(`Verified ${localCount} local hub brand icons (${registry.length} registry entries)`);
