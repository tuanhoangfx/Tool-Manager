import { useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { EXTENSION_HEADER_LABEL, isChromeWebStoreLive } from "./extensionInstall";
import { useExtensionRelease } from "./useExtensionRelease";
import { CookieExtensionDownloadConfirm } from "./CookieExtensionDownloadConfirm";
import "./cookie-extension-fab.css";

type Props = {
  /** Only show while Cookie tab is active (portal stays viewport-fixed). */
  active?: boolean;
};

/** Floating extension download — fixed to viewport bottom-right via portal. */
export function CookieExtensionFab({ active = true }: Props) {
  const release = useExtensionRelease();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (typeof document === "undefined") return null;

  const storeLive = isChromeWebStoreLive();
  const fabTitle = storeLive
    ? `${EXTENSION_HEADER_LABEL} v${release.version} — Install from Chrome Web Store`
    : `Download ${EXTENSION_HEADER_LABEL} v${release.version} (GitHub ZIP)`;

  return (
    <>
      {active
        ? createPortal(
            <div className="workspace-fab-stack--cookie" aria-label="Cookie extension download">
              <button
                type="button"
                className="workspace-fab workspace-fab--download workspace-fab--pulse"
                title={fabTitle}
                aria-label={fabTitle}
                onClick={() => setConfirmOpen(true)}
              >
                <Download size={16} strokeWidth={2.35} aria-hidden />
              </button>
            </div>,
            document.body,
          )
        : null}
      <CookieExtensionDownloadConfirm open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </>
  );
}
