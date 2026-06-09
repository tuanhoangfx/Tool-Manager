import { useState } from "react";
import { Cookie, Download } from "lucide-react";
import {
  EXTENSION_CHROME_WEB_STORE_URL,
  EXTENSION_HEADER_LABEL,
  EXTENSION_INSTALL_HINT,
  isChromeWebStoreLive,
} from "./extensionInstall";
import { fetchLatestExtensionRelease } from "./extensionReleaseApi";
import { triggerExtensionZipDownload } from "./extensionDownload";
import { useExtensionRelease } from "./useExtensionRelease";
import "./cookie-extension-header-cta.css";

type Props = {
  className?: string;
};

/** Header CTA — downloads latest release ZIP from GitHub (refreshes release info on each click). */
export function CookieExtensionHeaderLink({ className = "" }: Props) {
  const release = useExtensionRelease();
  const [busy, setBusy] = useState(false);

  const onDownload = () => {
    if (busy) return;
    if (isChromeWebStoreLive() && EXTENSION_CHROME_WEB_STORE_URL) {
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

  return (
    <button
      type="button"
      className={`cookie-extension-header-cta group ${className}`.trim()}
      title={`${EXTENSION_INSTALL_HINT} (v${release.version})`}
      aria-label={
        isChromeWebStoreLive()
          ? `Install ${EXTENSION_HEADER_LABEL} from Chrome Web Store v${release.version}`
          : `Download ${EXTENSION_HEADER_LABEL} v${release.version}`
      }
      disabled={busy}
      onClick={onDownload}
    >
      <span className="cookie-extension-header-cta__glow" aria-hidden />
      <Cookie size={14} className="cookie-extension-header-cta__icon shrink-0" aria-hidden />
      <span className="cookie-extension-header-cta__label truncate">{EXTENSION_HEADER_LABEL}</span>
      <span className="cookie-extension-header-cta__ver tabular-nums">
        {busy ? "…" : `v${release.version}`}
      </span>
      <Download
        size={12}
        className="cookie-extension-header-cta__dl shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}
