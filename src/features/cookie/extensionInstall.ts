import { EXTENSION_BUILD } from "./extensionBuildInfo";

export const EXTENSION_GITHUB_REPO = "tuanhoangfx/E0001-cookie-bridge";

/** Latest release page (redirects to newest tag). */
export const EXTENSION_RELEASE_PAGE = `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest`;

/** Direct ZIP URL for a given extension version (must match the asset name on GitHub). */
export function extensionReleaseZipUrl(version: string = EXTENSION_BUILD.version): string {
  return `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest/download/E0001-cookie-bridge-v${version}.zip`;
}

/**
 * Static ZIP link using the bundled version (may 404 until `pnpm sync:extension` / deploy).
 * Prefer {@link fetchLatestExtensionRelease} or {@link useExtensionRelease} for auto-latest.
 */
export const EXTENSION_RELEASE_ZIP = extensionReleaseZipUrl();

export const EXTENSION_INSTALL_LABEL = "Load unpacked";

/** Header CTA label (links to latest release page). */
export const EXTENSION_HEADER_LABEL = "Cookie Auto Extension";

export const EXTENSION_INSTALL_HINT =
  "Download latest ZIP → extract → chrome://extensions → Developer mode → Load unpacked → Link extension on Cookie Auto";
