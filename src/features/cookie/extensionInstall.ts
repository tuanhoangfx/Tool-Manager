import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { EXTENSION_CWS_LISTING_STATUS } from "./extensionCwsBuildInfo";

export const EXTENSION_GITHUB_REPO = "tuanhoangfx/E0001-cookie-bridge";

/** Latest release page (redirects to newest tag). */
export const EXTENSION_RELEASE_PAGE = `https://github.com/${EXTENSION_GITHUB_REPO}/releases/latest`;

/** Chrome Web Store install page (E0001 Cookie Bridge). */
export const EXTENSION_CHROME_WEB_STORE_ID = "kaaadageakdandpobcofplmfbjfjabdk";

export const EXTENSION_CHROME_WEB_STORE_URL =
  `https://chromewebstore.google.com/detail/e0001-cookie-bridge/${EXTENSION_CHROME_WEB_STORE_ID}` as const;

/** Human label when store link is available. */
export const EXTENSION_CHROME_WEB_STORE_LABEL = "Install from Chrome Web Store";

/** GitHub ZIP direct download (Load unpacked fallback). */
export const EXTENSION_GITHUB_ZIP_LABEL = "Download ZIP from GitHub";

/** Public privacy policy (hosted on Data Box). */
export const EXTENSION_PRIVACY_POLICY_URL = "https://databox.infi.io.vn/e0001-privacy.html";

/** GitHub release ZIP version (fallback when Store unavailable). */
export function getExtensionDownloadVersion(): string {
  return EXTENSION_BUILD.downloadVersion ?? EXTENSION_BUILD.version;
}

/** Direct ZIP for a specific release tag (offline fallback; not “latest” redirect). */
export function extensionReleaseZipUrl(version: string = getExtensionDownloadVersion()): string {
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

/** Store listing approved and installable from Chrome Web Store. */
export function isChromeWebStoreLive(): boolean {
  return hasChromeWebStoreInstall() && EXTENSION_CWS_LISTING_STATUS === "published";
}

export function getExtensionInstallLabel(): string {
  return isChromeWebStoreLive() ? EXTENSION_CHROME_WEB_STORE_LABEL : "Load unpacked";
}

export function getExtensionInstallSteps(): ExtensionInstallStep[] {
  return isChromeWebStoreLive() ? EXTENSION_STORE_INSTALL_STEPS : EXTENSION_UNPACKED_INSTALL_STEPS;
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

export const EXTENSION_UNPACKED_INSTALL_STEPS: ExtensionInstallStep[] = [
  { id: "download", title: "Download ZIP", hint: "Latest release from GitHub" },
  { id: "extract", title: "Extract folder", hint: "Unzip to a permanent path (e.g. C:\\Tools\\E0001-cookie-bridge)" },
  { id: "chrome", title: "Open extensions", hint: "Paste in Chrome address bar", symbol: "chrome://extensions" },
  { id: "devmode", title: "Developer mode", hint: "Toggle ON at the top-right", symbol: "ON" },
  { id: "unpacked", title: "Load unpacked", hint: "Select the extracted extension folder" },
  { id: "link", title: "Link on Cookie Auto", hint: "Data Box → Cookie Auto → sign in & connect extension" },
];

export const EXTENSION_STORE_INSTALL_STEPS: ExtensionInstallStep[] = [
  {
    id: "store",
    title: "Install from Chrome Web Store",
    hint: "Add to Chrome — no Developer mode or ZIP extract",
    symbol: "Add to Chrome",
  },
  { id: "link", title: "Link on Cookie Auto", hint: "Sign in here → Link extension on this tab" },
  {
    id: "download",
    title: EXTENSION_GITHUB_ZIP_LABEL,
    hint: "Optional — dev / Load unpacked when Store is unavailable",
    symbol: "GitHub",
  },
];

/** Load unpacked sub-steps after GitHub ZIP (Store live — optional dev path). */
export const EXTENSION_STORE_UNPACKED_OPTIONAL_STEPS: ExtensionInstallStep[] =
  EXTENSION_UNPACKED_INSTALL_STEPS.filter((step) => step.id !== "download" && step.id !== "link");

/** Primary install steps — Store when published, else Load unpacked. */
export const EXTENSION_INSTALL_STEPS: ExtensionInstallStep[] = getExtensionInstallSteps();
