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

/** GitHub ZIP direct download (Load unpacked). */
export const EXTENSION_GITHUB_ZIP_LABEL = "Download ZIP from GitHub";

/** Public privacy policy (hosted on Data Box). */
export const EXTENSION_PRIVACY_POLICY_URL = "https://databox.infi.io.vn/e0001-privacy.html";

/** GitHub release ZIP version. */
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

/** Header CTA label (links to latest release page). */
export const EXTENSION_HEADER_LABEL = "Cookie Auto Extension";

export function hasChromeWebStoreInstall(): boolean {
  return Boolean(EXTENSION_CHROME_WEB_STORE_URL);
}

/** Listing is live on Chrome Web Store (includes pending update while current build remains installable). */
export function isChromeWebStoreListed(): boolean {
  return (
    hasChromeWebStoreInstall() &&
    (EXTENSION_CWS_LISTING_STATUS === "published" || EXTENSION_CWS_LISTING_STATUS === "in_review")
  );
}

/** Store listing approved and one-click install is the primary path. */
export function isChromeWebStoreLive(): boolean {
  return hasChromeWebStoreInstall() && EXTENSION_CWS_LISTING_STATUS === "published";
}

/** Chip in Release table — listing stays Published while a new version is in review. */
export function getChromeWebStoreListingChipStatus(): typeof EXTENSION_CWS_LISTING_STATUS {
  if (EXTENSION_CWS_LISTING_STATUS === "in_review") return "published";
  return EXTENSION_CWS_LISTING_STATUS;
}

/** Pending CWS package review (newer than live store build). */
export function getChromeWebStoreUpdateStatus(): typeof EXTENSION_CWS_LISTING_STATUS | null {
  if (EXTENSION_CWS_LISTING_STATUS === "in_review") return "in_review";
  return null;
}

export function getExtensionInstallLabel(): string {
  if (!hasChromeWebStoreInstall()) return "Load unpacked (GitHub ZIP)";
  return `${EXTENSION_CHROME_WEB_STORE_LABEL} · ${EXTENSION_GITHUB_ZIP_LABEL}`;
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
    hint: "Add to Chrome — no Developer mode or ZIP extract",
    symbol: "Add to Chrome",
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

export function getExtensionInstallSteps(): ExtensionInstallStep[] {
  return hasChromeWebStoreInstall() ? EXTENSION_STORE_INSTALL_STEPS : EXTENSION_UNPACKED_INSTALL_STEPS;
}

/** Primary install steps — kept for legacy callers. */
export const EXTENSION_INSTALL_STEPS: ExtensionInstallStep[] = getExtensionInstallSteps();

export const EXTENSION_INSTALL_HINT = hasChromeWebStoreInstall()
  ? `${EXTENSION_CHROME_WEB_STORE_LABEL} or ${EXTENSION_GITHUB_ZIP_LABEL} → open Cookie Auto → Link extension`
  : "Download latest ZIP → extract → chrome://extensions → Developer mode → Load unpacked → Link extension on Cookie Auto";
