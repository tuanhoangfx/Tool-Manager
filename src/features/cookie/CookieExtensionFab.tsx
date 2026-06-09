import { useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { EXTENSION_HEADER_LABEL, EXTENSION_CHROME_WEB_STORE_URL, isChromeWebStoreLive } from "./extensionInstall";
import { fetchLatestExtensionRelease } from "./extensionReleaseApi";
import { triggerExtensionZipDownload } from "./extensionDownload";
import { useExtensionRelease } from "./useExtensionRelease";
import "./cookie-extension-fab.css";

type Props = {
  /** Only show while Cookie tab is active (portal stays viewport-fixed). */
  active?: boolean;
};

/** Floating extension download — one click fetches GitHub latest and downloads ZIP (or opens CWS when live). */
export function CookieExtensionFab({ active = true }: Props) {
  const release = useExtensionRelease();
  const [busy, setBusy] = useState(false);

  if (typeof document === "undefined") return null;

  const storeLive = isChromeWebStoreLive();
  const fabTitle = storeLive
    ? `${EXTENSION_HEADER_LABEL} v${release.version} — Install from Chrome Web Store`
    : `Download ${EXTENSION_HEADER_LABEL} v${release.version} (latest GitHub ZIP)`;

  const onDownload = () => {
    if (busy) return;
    if (storeLive && EXTENSION_CHROME_WEB_STORE_URL) {
      window.open(EXTENSION_CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const latest = await fetchLatestExtensionRelease();
        await triggerExtensionZipDownload(latest);
      } finally {
        setBusy(false);
      }
    })();
  };

  return active
    ? createPortal(
        <div className="workspace-fab-stack--cookie" aria-label="Cookie extension download">
          <button
            type="button"
            className="workspace-fab workspace-fab--download workspace-fab--pulse"
            title={fabTitle}
            aria-label={fabTitle}
            aria-busy={busy}
            disabled={busy}
            onClick={onDownload}
          >
            <Download size={16} strokeWidth={2.35} aria-hidden />
          </button>
        </div>,
        document.body,
      )
    : null;
}
