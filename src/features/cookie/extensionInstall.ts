import { EXTENSION_BUILD } from "./extensionBuildInfo";

export const EXTENSION_GITHUB_REPO = "tuanhoangfx/E0001-cookie-bridge";

/** Latest release page (redirects to newest tag). */
export const EXTENSION_RELEASE_PAGE = `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest`;

/** Direct ZIP for a specific release tag (offline fallback; not “latest” redirect). */
export function extensionReleaseZipUrl(version: string = EXTENSION_BUILD.version): string {
  const v = version.replace(/^v/i, "").trim();
  const tag = `v${v}`;
  const zipName = `E0001-cookie-bridge-v${v}.zip`;
  return `https://github.com/${EXTENSION_GITHUB_REPO}/releases/download/${tag}/${zipName}`;
}

/**
 * Bundled fallback URL — prefer {@link fetchLatestExtensionRelease} / {@link useExtensionRelease}.
 * Updated automatically by `prebuild` / `predev` (sync-extension-version.mjs).
 */
export const EXTENSION_RELEASE_ZIP = extensionReleaseZipUrl();

export const EXTENSION_INSTALL_LABEL = "Load unpacked";

/** Header CTA label (links to latest release page). */
export const EXTENSION_HEADER_LABEL = "Cookie Auto Extension";

export const EXTENSION_INSTALL_HINT =
  "Download latest ZIP → extract → chrome://extensions → Developer mode → Load unpacked → Link extension on Cookie Auto";
