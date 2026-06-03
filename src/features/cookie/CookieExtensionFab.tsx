import { useState } from "react";
import { Download } from "lucide-react";
import { EXTENSION_HEADER_LABEL } from "./extensionInstall";
import { useExtensionRelease } from "./useExtensionRelease";
import { CookieExtensionDownloadConfirm } from "./CookieExtensionDownloadConfirm";
import "./cookie-extension-fab.css";

/** Floating download — extension only (no guide FAB). */
export function CookieExtensionFab() {
  const release = useExtensionRelease();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="workspace-fab-stack workspace-fab-stack--single" aria-label="Cookie extension download">
        <button
          type="button"
          className="workspace-fab workspace-fab--download"
          title={`${EXTENSION_HEADER_LABEL} v${release.version} — review before download`}
          aria-label={`Download ${EXTENSION_HEADER_LABEL} v${release.version}`}
          onClick={() => setConfirmOpen(true)}
        >
          <Download size={17} strokeWidth={2.35} aria-hidden />
        </button>
      </div>
      <CookieExtensionDownloadConfirm open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </>
  );
}
