#!/usr/bin/env node
/**
 * Sync extensionBuildInfo.ts from E0001 manifest (monorepo) or GitHub releases/latest (CI).
 * Runs on prebuild/predev — no manual bump in P0020 after each extension release.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GITHUB_REPO = "tuanhoangfx/E0001-cookie-bridge";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "src", "features", "cookie", "extensionBuildInfo.ts");
const extDir = join(root, "..", "..", "Extension", "E0001-cookie-bridge");
const manifestPath = join(extDir, "manifest.json");

function readExistingVersion() {
  if (!existsSync(outPath)) return null;
  const text = readFileSync(outPath, "utf8");
  const match = text.match(/version:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function writeBuildInfo({ version, updated, source }) {
  const out = `/**
 * Offline fallback only (labels + ZIP if GitHub API fails).
 * Auto-synced - do not edit by hand. Source: ${source}
 * Download button uses GitHub releases/latest at runtime.
 */
export const EXTENSION_BUILD = {
  version: "${version}",
  updated: "${updated}",
};
`;
  writeFileSync(outPath, out);
  console.log(`extensionBuildInfo.ts ← ${source} v${version}`);
}

async function fromGitHub() {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "p0020-sync-extension-version",
    },
  });
  if (!res.ok) throw new Error(`GitHub releases/latest: ${res.status}`);
  const release = await res.json();
  const version = String(release.tag_name ?? "")
    .replace(/^v/i, "")
    .trim();
  if (!version) throw new Error("missing tag_name");
  const updated =
    typeof release.published_at === "string" ? release.published_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { version, updated, source: "GitHub latest" };
}

function fromLocalManifest() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const buildInfo = readFileSync(join(extDir, "build-info.js"), "utf8");
  const updatedMatch = buildInfo.match(/updated:\s*"([^"]+)"/);
  const updated = updatedMatch?.[1] ?? new Date().toISOString().slice(0, 10);
  return { version: manifest.version, updated, source: "E0001 manifest" };
}

async function main() {
  try {
    if (existsSync(manifestPath)) {
      writeBuildInfo(fromLocalManifest());
      return;
    }
    writeBuildInfo(await fromGitHub());
  } catch (err) {
    const keep = readExistingVersion();
    console.log(
      `sync-extension-version: keep v${keep ?? "?"} (${err instanceof Error ? err.message : err})`,
    );
    process.exit(0);
  }
}

await main();
