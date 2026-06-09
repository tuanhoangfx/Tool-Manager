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
const cwsOutPath = join(root, "src", "features", "cookie", "extensionCwsBuildInfo.ts");
const extDir = join(root, "..", "..", "Extension", "E0001-cookie-bridge");
const manifestPath = join(extDir, "manifest.json");
const toolManifestPath = join(extDir, "tool.manifest.json");

function readExistingVersion() {
  if (!existsSync(outPath)) return null;
  const text = readFileSync(outPath, "utf8");
  const match = text.match(/version:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function writeBuildInfo({ version, downloadVersion, updated, source }) {
  const out = `/**
 * Offline fallback only (labels + ZIP if GitHub API fails).
 * Auto-synced - do not edit by hand. Source: ${source}
 * Download button uses GitHub releases/latest at runtime.
 */
export const EXTENSION_BUILD = {
  version: "${version}",
  downloadVersion: "${downloadVersion}",
  updated: "${updated}",
};
`;
  writeFileSync(outPath, out);
  console.log(`extensionBuildInfo.ts ← ${source} v${version} (download v${downloadVersion})`);
}

function readDownloadVersionFromTool() {
  if (!existsSync(toolManifestPath)) return null;
  const tool = JSON.parse(readFileSync(toolManifestPath, "utf8"));
  const tag = tool.release?.latestPublished?.tag;
  if (!tag) return null;
  return String(tag).replace(/^v/i, "").trim() || null;
}

function writeCwsBuildInfo(cws) {
  const out = `/**
 * CWS listing status — auto-synced from E0001 tool.manifest.json.
 * Do not edit by hand. Source: sync-extension-version.mjs
 */
export type ExtensionCwsListingStatus = "draft" | "in_review" | "published" | "rejected" | "unknown";

export const EXTENSION_CWS_LISTING_STATUS = "${cws.listingStatus}" as ExtensionCwsListingStatus;
`;
  writeFileSync(cwsOutPath, out);
  console.log(`extensionCwsBuildInfo.ts ← ${cws.listingStatus}`);
}

function readCwsFromToolManifest() {
  const fallback = { listingStatus: "unknown" };
  if (!existsSync(toolManifestPath)) return fallback;
  const tool = JSON.parse(readFileSync(toolManifestPath, "utf8"));
  return { listingStatus: tool.chromeWebStore?.listingStatus ?? fallback.listingStatus };
}

async function readCwsFromGitHub() {
  const fallback = { listingStatus: "unknown" };
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/main/tool.manifest.json`,
      { headers: { "User-Agent": "p0020-sync-extension-version" } },
    );
    if (!res.ok) return fallback;
    const tool = await res.json();
    return { listingStatus: tool.chromeWebStore?.listingStatus ?? fallback.listingStatus };
  } catch {
    return fallback;
  }
}

async function resolveCwsListingStatus() {
  const local = readCwsFromToolManifest();
  if (local.listingStatus !== "unknown" || existsSync(toolManifestPath)) return local;
  return readCwsFromGitHub();
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
  return { version, downloadVersion: version, updated, source: "GitHub latest" };
}

function fromLocalManifest() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const buildInfo = readFileSync(join(extDir, "build-info.js"), "utf8");
  const updatedMatch = buildInfo.match(/updated:\s*"([^"]+)"/);
  const updated = updatedMatch?.[1] ?? new Date().toISOString().slice(0, 10);
  const version = manifest.version;
  const downloadVersion = readDownloadVersionFromTool() ?? version;
  return { version, downloadVersion, updated, source: "E0001 manifest" };
}

async function main() {
  try {
    const cws = await resolveCwsListingStatus();
    if (existsSync(manifestPath)) {
      writeBuildInfo(fromLocalManifest());
      writeCwsBuildInfo(cws);
      return;
    }
    writeBuildInfo(await fromGitHub());
    writeCwsBuildInfo(cws);
  } catch (err) {
    const keep = readExistingVersion();
    console.log(
      `sync-extension-version: keep v${keep ?? "?"} (${err instanceof Error ? err.message : err})`,
    );
    process.exit(0);
  }
}

await main();
