#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const registryPath = path.join(projectRoot, "src", "features", "twofa", "twofa-platform-icons.registry.json");
const THESVG_CDN = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const missing = [];
const corrupt = [];
/** Drive exports that must stay favicon (mono/watermark). */
const MIN_PNG_BYTES = {
  "assets/brand-icons/capcut.png": 800,
  "assets/brand-icons/augment.png": 800,
  "assets/brand-icons/whatsapp.png": 2000,
};
const MIN_ICO_BYTES = { "assets/brand-icons/adobe.ico": 5000 };
let localCount = 0;
let thesvgCount = 0;

for (const entry of registry) {
  if (entry.source?.type === "local") {
    localCount += 1;
    const rel = entry.source.src.replace(/^\//, "");
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
          corrupt.push({ label: entry.label, asset: entry.source.src, reason: `bad asset or < ${floor} B` });
        }
      }
    } catch {
      missing.push({ label: entry.label, asset: entry.source.src });
    }
  } else if (entry.source?.type === "thesvg") {
    thesvgCount += 1;
    const url = `${THESVG_CDN}/${entry.source.slug}/default.svg`;
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) missing.push({ label: entry.label, asset: `thesvg:${entry.source.slug} (${res.status})` });
  }
}

if (missing.length) {
  console.error("Twofa platform icon assets missing:");
  for (const row of missing) console.error(`  - ${row.label}: ${row.asset}`);
  process.exit(1);
}

if (corrupt.length) {
  console.error("Twofa platform icon assets corrupt (re-run pnpm sync:twofa-icons):");
  for (const row of corrupt) console.error(`  - ${row.label}: ${row.asset} (${row.reason})`);
  process.exit(1);
}

console.log(`Verified ${registry.length} twofa platform icons (${localCount} local, ${thesvgCount} thesvg)`);
