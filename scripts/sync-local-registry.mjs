#!/usr/bin/env node
/**
 * Sync P0019/P0020 local-registry entries between P0020-Data-Box and P0004-Tool-Hub.
 * Usage: pnpm sync:local-registry
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const p0020Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolRoot = path.resolve(p0020Root, "..");
const targets = [
  path.join(p0020Root, "public/local-registry.json"),
  path.join(toolRoot, "P0004-Tool-Hub/public/local-registry.json"),
];

const SYNC_CODES = new Set(["P0019", "P0020"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function pickSource(entries) {
  const byCode = Object.fromEntries(
    entries.filter((e) => SYNC_CODES.has(e.code)).map((e) => [e.code, e]),
  );
  if (!byCode.P0020) {
    console.error("Missing P0020 entry in source registry.");
    process.exit(1);
  }
  return byCode;
}

function mergeVersionFromManifest(entry) {
  const manifestPath = path.join(entry.localPath.replace(/\\/g, path.sep), "tool.manifest.json");
  if (!fs.existsSync(manifestPath)) return entry;
  try {
    const manifest = readJson(manifestPath);
    if (manifest.release?.version) {
      entry.localVersion = manifest.release.version;
    }
    if (manifest.summary) {
      entry.summary = manifest.summary;
    }
  } catch {
    /* keep existing */
  }
  return entry;
}

const sourcePath = targets.find((p) => fs.existsSync(p));
if (!sourcePath) {
  console.error("No local-registry.json found.");
  process.exit(1);
}

const source = readJson(sourcePath);
const canonical = pickSource(source.repositories ?? []);
canonical.P0020 = mergeVersionFromManifest({ ...canonical.P0020 });

for (const targetPath of targets) {
  if (!fs.existsSync(targetPath)) {
    console.warn("Skip missing:", targetPath);
    continue;
  }
  const registry = readJson(targetPath);
  const repos = registry.repositories ?? [];
  const next = repos.map((entry) => {
    if (!SYNC_CODES.has(entry.code)) return entry;
    const fresh = canonical[entry.code];
    if (!fresh) return entry;
    return { ...entry, ...fresh, code: entry.code, id: entry.id ?? fresh.id };
  });

  for (const code of SYNC_CODES) {
    if (!next.some((e) => e.code === code) && canonical[code]) {
      next.push(canonical[code]);
    }
  }

  registry.repositories = next;
  registry.generatedAt = new Date().toISOString();
  writeJson(targetPath, registry);
  console.log("Synced P0019/P0020 →", targetPath);
}

console.log("local-registry sync complete.");
