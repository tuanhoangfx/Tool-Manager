import type { GitHubRelease } from "../../types";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import {
  EXTENSION_GITHUB_REPO,
  EXTENSION_RELEASE_PAGE,
  extensionReleaseZipUrl,
} from "./extensionInstall";

const RELEASE_API = `https://api.github.com/repos/${EXTENSION_GITHUB_REPO}/releases/latest`;
const RELEASES_API = `https://api.github.com/repos/${EXTENSION_GITHUB_REPO}/releases?per_page=10`;
// Keep this small: extension ZIP assets can be uploaded/replaced frequently,
// and we want the modal to reflect the updated release quickly.
const CACHE_TTL_MS = 60 * 1000;

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

    // If "latest" has no uploaded ZIP asset yet, fall back to the nearest
    // prior release that *does* have a ZIP (common when a tag is published
    // before the distribution asset is uploaded).
    const latestZip = pickZipAsset(release);
    if (!latestZip) {
      const listRes = await fetch(RELEASES_API, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (listRes.ok) {
        const releases = (await listRes.json()) as GitHubRelease[];
        const nearestWithZip = releases.find((r) => Boolean(pickZipAsset(r)));
        if (nearestWithZip) {
          const data = toInfo(nearestWithZip);
          cache = { at: Date.now(), data };
          return data;
        }
      }
    }

    const data = toInfo(release);
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
