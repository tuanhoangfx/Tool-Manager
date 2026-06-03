import { useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { EXTENSION_HEADER_LABEL } from "./extensionInstall";
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

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="workspace-fab-stack--cookie" aria-label="Cookie extension download">
        <button
          type="button"
          className="workspace-fab workspace-fab--download workspace-fab--pulse"
          title={`${EXTENSION_HEADER_LABEL} v${release.version} — review before download`}
          aria-label={`Download ${EXTENSION_HEADER_LABEL} v${release.version}`}
          onClick={() => setConfirmOpen(true)}
        >
          <Download size={16} strokeWidth={2.35} aria-hidden />
        </button>
      </div>
      <CookieExtensionDownloadConfirm open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </>,
    document.body,
  );
}
