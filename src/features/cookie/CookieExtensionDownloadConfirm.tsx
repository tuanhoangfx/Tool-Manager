import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  Download,
  ExternalLink,
  FolderOpen,
  Package,
  Tag,
} from "lucide-react";
import { HubModalFrame } from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../lib/ui-scale";
import { TocSectionNav } from "../overview/TocSectionNav";
import { TocHighlightContent, TocSectionHighlightProvider } from "../overview/toc-section-highlight-context";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { E0001_ICON_URL } from "./extensionBrand";
import { EXTENSION_HEADER_LABEL, EXTENSION_INSTALL_LABEL } from "./extensionInstall";
import { CookieExtensionInstallSteps } from "./CookieExtensionInstallSteps";
import { EXTENSION_DOWNLOAD_TOC, extensionDownloadSectionTitle } from "./extension-download-toc";
import { fetchLatestExtensionRelease, type ExtensionReleaseInfo } from "./extensionReleaseApi";
import { triggerExtensionZipDownload } from "./extensionDownload";
import { useExtensionRelease } from "./useExtensionRelease";

const ID_PREFIX = "ext-dl-";
const SCROLL_ROOT = ".modal-shell__scroll--user-access";

type Props = {
  open: boolean;
  onClose: () => void;
};

function DetailSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3 rounded-xl border border-white/5 bg-white/[.02] p-3">
      <h3 className="border-b border-white/5 pb-2 text-[15px] font-semibold leading-snug text-[var(--text)]">{title}</h3>
      {children}
    </section>
  );
}

function FieldRow({
  icon: Icon,
  iconClass,
  label,
  children,
}: {
  icon: typeof Tag;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-t border-white/5 first:border-0 transition-colors hover:bg-white/[.02]">
      <th className="w-32 py-2 pr-3 font-medium text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={compactIconSize(11)} className={iconClass} aria-hidden />
          {label}
        </span>
      </th>
      <td className="py-2 text-[var(--text)]">{children}</td>
    </tr>
  );
}

export function CookieExtensionDownloadConfirm({ open, onClose }: Props) {
  const bundled = useExtensionRelease();
  const [preview, setPreview] = useState<ExtensionReleaseInfo>(bundled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tocSectionIds = useMemo(
    () => EXTENSION_DOWNLOAD_TOC.map(({ id }) => `${ID_PREFIX}${id}`),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPreview(bundled);
    let cancelled = false;
    void fetchLatestExtensionRelease()
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not refresh release info from GitHub. Using bundled version.");
      });
    return () => {
      cancelled = true;
    };
  }, [bundled, open]);

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKey);
    document.body.classList.add("hub-modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("hub-modal-open");
    };
  }, [onKey, open]);

  const onConfirm = () => {
    if (busy) return;
    setBusy(true);
    void (async () => {
      try {
        const latest = await fetchLatestExtensionRelease();
        await triggerExtensionZipDownload(latest);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download failed.");
      } finally {
        setBusy(false);
      }
    })();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-backdrop modal-backdrop--tool-detail" role="presentation" onClick={onClose}>
      <HubModalFrame onClose={onClose}>
        <div
          className="modal-shell modal-shell--tool-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-extension-download-title"
        >
        <header className="user-access-modal__header">
          <div className="user-access-modal__header-main min-w-0 flex-1">
            <img
              src={E0001_ICON_URL}
              alt=""
              width={32}
              height={32}
              className="user-access-modal__avatar h-8 w-8 shrink-0 rounded-lg object-cover"
            />
            <h2
              id="cookie-extension-download-title"
              className="user-access-modal__header-name min-w-0 truncate text-sm font-semibold text-[var(--text)]"
            >
              {EXTENSION_HEADER_LABEL}
            </h2>
          </div>
        </header>

        <div className="modal-shell__scroll modal-shell__scroll--user-access">
          <TocSectionHighlightProvider sectionIds={tocSectionIds}>
            <div className="grid gap-4 lg:grid-cols-[var(--overview-toc-w)_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-0 lg:self-start">
                <TocSectionNav
                  items={EXTENSION_DOWNLOAD_TOC}
                  idPrefix={ID_PREFIX}
                  scrollRootSelector={SCROLL_ROOT}
                />
              </aside>

              <TocHighlightContent className="min-w-0 space-y-4 p-1 sm:p-2">
                <DetailSection id={`${ID_PREFIX}release`} title={extensionDownloadSectionTitle("release")}>
                  <table className="w-full text-left text-xs">
                    <tbody>
                      <FieldRow icon={Tag} iconClass="text-indigo-300" label="Latest">
                        <span className="cookie-dl-modal__latest-row">
                          <span className="font-semibold tabular-nums text-indigo-200">v{preview.version}</span>
                          <a
                            href={preview.releasePage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cookie-dl-modal__latest-link"
                          >
                            <ExternalLink size={13} aria-hidden />
                            <span>Open GitHub release</span>
                          </a>
                        </span>
                      </FieldRow>
                      <FieldRow icon={Archive} iconClass="text-slate-400" label="Bundled">
                        <span className="tabular-nums">
                          v{EXTENSION_BUILD.version} · {EXTENSION_BUILD.updated}
                        </span>
                      </FieldRow>
                      <FieldRow icon={Package} iconClass="text-amber-300" label="Package">
                        <span className="font-mono text-[11px] break-all">{preview.zipName}</span>
                      </FieldRow>
                      <FieldRow icon={FolderOpen} iconClass="text-emerald-300" label="Install">
                        {EXTENSION_INSTALL_LABEL}
                      </FieldRow>
                    </tbody>
                  </table>
                </DetailSection>

                <DetailSection id={`${ID_PREFIX}install`} title={extensionDownloadSectionTitle("install")}>
                  <CookieExtensionInstallSteps />
                </DetailSection>

                {error ? (
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {error}
                  </p>
                ) : null}
              </TocHighlightContent>
            </div>
          </TocSectionHighlightProvider>
        </div>

        <footer className="cookie-dl-modal__footer">
          <div className="cookie-dl-modal__footer-inner">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="cookie-dl-modal__confirm"
              aria-label={busy ? "Downloading" : "Confirm download"}
            >
              <Download
                size={16}
                aria-hidden
                className={`cookie-dl-modal__confirm-icon${busy ? " cookie-dl-modal__confirm-icon--busy" : ""}`}
              />
              <span>{busy ? "Downloading…" : "Confirm download"}</span>
            </button>
          </div>
        </footer>
        </div>
      </HubModalFrame>
    </div>,
    document.body,
  );
}
