import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const registryPath = path.join(projectRoot, "src", "features", "cookie", "cookieBrandIcons.registry.json");

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const missing = [];

for (const entry of registry) {
  if (entry.source?.type !== "local" || !entry.source.webSrc) continue;
  const asset = path.join(projectRoot, "public", entry.source.webSrc.replace(/^\//, ""));
  try {
    await access(asset);
  } catch {
    missing.push({ label: entry.label, asset: entry.source.webSrc });
  }
}

if (missing.length) {
  console.error("Cookie brand icon assets missing:");
  for (const row of missing) console.error(`  - ${row.label}: ${row.asset}`);
  process.exit(1);
}

console.log(`Verified ${registry.length} registry entries (${missing.length} missing local assets)`);
