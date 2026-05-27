import { EXTENSION_BUILD } from "./extensionBuildInfo";

export const EXTENSION_GITHUB_REPO = "tuanhoangfx/E0001-cookie-bridge";

/** Latest release page (redirects to newest tag). */
export const EXTENSION_RELEASE_PAGE = `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest`;

/**
 * Direct ZIP asset for the latest extension release.
 *
 * Why latest? Avoids 404 when EXTENSION_BUILD.version is bumped locally but the GitHub release
 * asset hasn't been created/uploaded yet.
 */
export const EXTENSION_RELEASE_ZIP = `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest/download/E0001-cookie-bridge-v${EXTENSION_BUILD.version}.zip`;

export const EXTENSION_INSTALL_LABEL = "Load unpacked";

/** Header CTA label (links to release ZIP). */
export const EXTENSION_HEADER_LABEL = "Cookie Auto Extension";

export const EXTENSION_INSTALL_HINT =
  "Download ZIP → extract → chrome://extensions → Developer mode → Load unpacked → Link extension here";
