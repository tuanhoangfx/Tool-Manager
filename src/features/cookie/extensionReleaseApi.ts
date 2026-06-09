import type { GitHubRelease } from "../../types";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import {
  EXTENSION_GITHUB_REPO,
  EXTENSION_RELEASE_PAGE,
  extensionReleaseZipUrl,
  getExtensionDownloadVersion,
} from "./extensionInstall";

const RELEASE_API = `https://api.github.com/repos/${EXTENSION_GITHUB_REPO}/releases/latest`;
const RELEASES_API = `https://api.github.com/repos/${EXTENSION_GITHUB_REPO}/releases?per_page=10`;
const CACHE_TTL_MS = 60 * 1000;

export type ExtensionReleaseInfo = {
  version: string;
  releasePage: string;
  zipUrl: string;
  zipName: string;
};

let cache: { at: number; data: ExtensionReleaseInfo } | null = null;

export function clearExtensionReleaseCache() {
  cache = null;
}

function parseVersionFromTag(tag?: string): string {
  if (!tag?.trim()) return getExtensionDownloadVersion();
  return tag.replace(/^v/i, "").trim();
}

function pickZipAsset(release: GitHubRelease) {
  return release.assets?.find((a) => a.name.toLowerCase().endsWith(".zip"));
}

function toInfo(release: GitHubRelease): ExtensionReleaseInfo {
  const zip = pickZipAsset(release);
  const version = parseVersionFromTag(release.tag_name);
  const zipName = zip?.name ?? `E0001-cookie-bridge-v${version}.zip`;
  return {
    version,
    releasePage: release.html_url ?? EXTENSION_RELEASE_PAGE,
    zipUrl: zip?.browser_download_url ?? extensionReleaseZipUrl(version),
    zipName,
  };
}

function staticFallback(): ExtensionReleaseInfo {
  const version = getExtensionDownloadVersion();
  const zipName = `E0001-cookie-bridge-v${version}.zip`;
  return {
    version,
    releasePage: EXTENSION_RELEASE_PAGE,
    zipUrl: extensionReleaseZipUrl(version),
    zipName,
  };
}

async function fetchNearestReleaseWithZip(): Promise<ExtensionReleaseInfo | null> {
  const listRes = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "p0020-extension-release" },
  });
  if (!listRes.ok) return null;
  const releases = (await listRes.json()) as GitHubRelease[];
  if (!Array.isArray(releases)) return null;
  const nearest = releases.find((r) => Boolean(pickZipAsset(r)));
  return nearest ? toInfo(nearest) : null;
}

/** Latest extension release from GitHub (cached). Falls back to bundled downloadVersion. */
export async function fetchLatestExtensionRelease(): Promise<ExtensionReleaseInfo> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const res = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "p0020-extension-release" },
    });
    if (res.ok) {
      const release = (await res.json()) as GitHubRelease;
      if (pickZipAsset(release)) {
        const data = toInfo(release);
        cache = { at: Date.now(), data };
        return data;
      }
    }

    const nearest = await fetchNearestReleaseWithZip();
    if (nearest) {
      cache = { at: Date.now(), data: nearest };
      return nearest;
    }
  } catch {
    /* fall through */
  }

  const data = staticFallback();
  cache = { at: Date.now(), data };
  return data;
}

export function getCachedExtensionRelease(): ExtensionReleaseInfo | null {
  if (!cache || Date.now() - cache.at >= CACHE_TTL_MS) return null;
  return cache.data;
}
