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

export type ExtensionInstallStepId =
  | "download"
  | "extract"
  | "chrome"
  | "devmode"
  | "unpacked"
  | "link";

export type ExtensionInstallStep = {
  id: ExtensionInstallStepId;
  title: string;
  hint: string;
  /** Short symbol shown beside the step (address, toggle, etc.). */
  symbol?: string;
};

export const EXTENSION_INSTALL_STEPS: ExtensionInstallStep[] = [
  { id: "download", title: "Download ZIP", hint: "Latest release from GitHub" },
  { id: "extract", title: "Extract folder", hint: "Unzip to a permanent path (e.g. C:\\Tools\\E0001-cookie-bridge)" },
  { id: "chrome", title: "Open extensions", hint: "Paste in Chrome address bar", symbol: "chrome://extensions" },
  { id: "devmode", title: "Developer mode", hint: "Toggle ON at the top-right", symbol: "ON" },
  { id: "unpacked", title: "Load unpacked", hint: "Select the extracted extension folder" },
  { id: "link", title: "Link on Cookie Auto", hint: "Data Box → Cookie Auto → sign in & connect extension" },
];
