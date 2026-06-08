import { EXTENSION_BUILD } from "./extensionBuildInfo";

export const EXTENSION_GITHUB_REPO = "tuanhoangfx/E0001-cookie-bridge";

/** Latest release page (redirects to newest tag). */
export const EXTENSION_RELEASE_PAGE = `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest`;

/** Chrome Web Store install page (E0001 Cookie Bridge). */
export const EXTENSION_CHROME_WEB_STORE_ID = "kaaadageakdandpobcofplmfbjfjabdk";

export const EXTENSION_CHROME_WEB_STORE_URL =
  `https://chrome.google.com/webstore/detail/e0001-cookie-bridge/${EXTENSION_CHROME_WEB_STORE_ID}` as const;

/** Human label when store link is available. */
export const EXTENSION_CHROME_WEB_STORE_LABEL = "Install from Chrome Web Store";

/** Public privacy policy (hosted on Data Box). */
export const EXTENSION_PRIVACY_POLICY_URL = "https://databox.infi.io.vn/e0001-privacy.html";

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

export const EXTENSION_INSTALL_LABEL = EXTENSION_CHROME_WEB_STORE_URL
  ? EXTENSION_CHROME_WEB_STORE_LABEL
  : "Load unpacked";

/** Header CTA label (links to latest release page). */
export const EXTENSION_HEADER_LABEL = "Cookie Auto Extension";

export const EXTENSION_INSTALL_HINT = EXTENSION_CHROME_WEB_STORE_URL
  ? "Install from Chrome Web Store → open Cookie Auto → Link extension"
  : "Download latest ZIP → extract → chrome://extensions → Developer mode → Load unpacked → Link extension on Cookie Auto";

export function hasChromeWebStoreInstall(): boolean {
  return Boolean(EXTENSION_CHROME_WEB_STORE_URL);
}

export type ExtensionInstallStepId =
  | "store"
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

export const EXTENSION_STORE_INSTALL_STEPS: ExtensionInstallStep[] = [
  {
    id: "store",
    title: "Install from Chrome Web Store",
    hint: "One-click add to Chrome — no Developer mode",
    symbol: "Chrome Web Store",
  },
  { id: "link", title: "Link on Cookie Auto", hint: "Sign in here → Link extension on this tab" },
];

export const EXTENSION_UNPACKED_INSTALL_STEPS: ExtensionInstallStep[] = [
  { id: "download", title: "Download ZIP", hint: "Latest release from GitHub" },
  { id: "extract", title: "Extract folder", hint: "Unzip to a permanent path (e.g. C:\\Tools\\E0001-cookie-bridge)" },
  { id: "chrome", title: "Open extensions", hint: "Paste in Chrome address bar", symbol: "chrome://extensions" },
  { id: "devmode", title: "Developer mode", hint: "Toggle ON at the top-right", symbol: "ON" },
  { id: "unpacked", title: "Load unpacked", hint: "Select the extracted extension folder" },
  { id: "link", title: "Link on Cookie Auto", hint: "Data Box → Cookie Auto → sign in & connect extension" },
];

/** Primary install steps — Store when published, else Load unpacked. */
export const EXTENSION_INSTALL_STEPS: ExtensionInstallStep[] = EXTENSION_CHROME_WEB_STORE_URL
  ? EXTENSION_STORE_INSTALL_STEPS
  : EXTENSION_UNPACKED_INSTALL_STEPS;
