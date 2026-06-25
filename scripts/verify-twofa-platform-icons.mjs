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
let localCount = 0;
let thesvgCount = 0;

for (const entry of registry) {
  if (entry.source?.type === "local") {
    localCount += 1;
    const asset = path.join(projectRoot, "public", entry.source.src.replace(/^\//, ""));
    try {
      await access(asset);
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

console.log(`Verified ${registry.length} twofa platform icons (${localCount} local, ${thesvgCount} thesvg)`);
