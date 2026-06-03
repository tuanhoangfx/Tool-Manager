import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cookie, Download, ExternalLink, X } from "lucide-react";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { EXTENSION_HEADER_LABEL, EXTENSION_INSTALL_HINT, EXTENSION_INSTALL_LABEL } from "./extensionInstall";
import { fetchLatestExtensionRelease, type ExtensionReleaseInfo } from "./extensionReleaseApi";
import { triggerExtensionZipDownload } from "./extensionDownload";
import { useExtensionRelease } from "./useExtensionRelease";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CookieExtensionDownloadConfirm({ open, onClose }: Props) {
  const bundled = useExtensionRelease();
  const [preview, setPreview] = useState<ExtensionReleaseInfo>(bundled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return () => window.removeEventListener("keydown", onKey);
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
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm extension download"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-2xl shadow-black/50">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
              <Cookie size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--text)]">{EXTENSION_HEADER_LABEL}</h2>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">E0001 Cookie Bridge · Chrome extension</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4 text-[13px]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-xl border border-white/8 bg-white/[.03] p-3">
            <dt className="text-[var(--muted)]">Version</dt>
            <dd className="font-semibold tabular-nums text-violet-200">v{preview.version}</dd>
            <dt className="text-[var(--muted)]">Bundled</dt>
            <dd className="tabular-nums text-[var(--text)]/90">
              v{EXTENSION_BUILD.version} ({EXTENSION_BUILD.updated})
            </dd>
            <dt className="text-[var(--muted)]">Package</dt>
            <dd className="truncate font-mono text-[11px] text-[var(--text)]/85">{preview.zipName}</dd>
            <dt className="text-[var(--muted)]">Install</dt>
            <dd className="text-[var(--text)]/90">{EXTENSION_INSTALL_LABEL}</dd>
          </dl>

          <p className="leading-relaxed text-[var(--muted)]">{EXTENSION_INSTALL_HINT}</p>

          {error ? (
            <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 px-5 py-3">
          <a
            href={preview.releasePage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ExternalLink size={14} />
            Releases
          </a>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/25 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/35 disabled:opacity-60"
          >
            <Download size={14} />
            {busy ? "Downloading…" : "Confirm download"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
