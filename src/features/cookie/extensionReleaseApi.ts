import type { GitHubRelease } from "../../types";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import {
  EXTENSION_GITHUB_REPO,
  EXTENSION_RELEASE_PAGE,
  extensionReleaseZipUrl,
} from "./extensionInstall";

const RELEASE_API = `https://api.github.com/repos/${EXTENSION_GITHUB_REPO}/releases/latest`;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type ExtensionReleaseInfo = {
  version: string;
  releasePage: string;
  zipUrl: string;
  zipName: string;
};

let cache: { at: number; data: ExtensionReleaseInfo } | null = null;

function parseVersionFromTag(tag?: string): string {
  if (!tag?.trim()) return EXTENSION_BUILD.version;
  return tag.replace(/^v/i, "").trim();
}

function pickZipAsset(release: GitHubRelease) {
  return release.assets?.find((a) => a.name.toLowerCase().endsWith(".zip"));
}

function staticFallback(): ExtensionReleaseInfo {
  const version = EXTENSION_BUILD.version;
  const zipName = `E0001-cookie-bridge-v${version}.zip`;
  return {
    version,
    releasePage: EXTENSION_RELEASE_PAGE,
    zipUrl: extensionReleaseZipUrl(version),
    zipName,
  };
}

/** Latest extension release from GitHub (cached). Falls back to bundled extensionBuildInfo. */
export async function fetchLatestExtensionRelease(): Promise<ExtensionReleaseInfo> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const res = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub releases/latest: ${res.status}`);
    const release = (await res.json()) as GitHubRelease;
    const zip = pickZipAsset(release);
    const version = parseVersionFromTag(release.tag_name);
    const zipName = zip?.name ?? `E0001-cookie-bridge-v${version}.zip`;
    const data: ExtensionReleaseInfo = {
      version,
      releasePage: release.html_url ?? EXTENSION_RELEASE_PAGE,
      zipUrl: zip?.browser_download_url ?? extensionReleaseZipUrl(version),
      zipName,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    const data = staticFallback();
    cache = { at: Date.now(), data };
    return data;
  }
}

export function getCachedExtensionRelease(): ExtensionReleaseInfo | null {
  if (!cache || Date.now() - cache.at >= CACHE_TTL_MS) return null;
  return cache.data;
}
