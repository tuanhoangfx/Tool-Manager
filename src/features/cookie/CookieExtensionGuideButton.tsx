import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Cookie, Download, ExternalLink, X, type LucideIcon } from "lucide-react";
import { cookieScreenUrl } from "../../lib/app-urls";
import { triggerExtensionZipDownload } from "./extensionDownload";
import { fetchLatestExtensionRelease } from "./extensionReleaseApi";
import { useExtensionRelease } from "./useExtensionRelease";
import "./cookie-extension-fab.css";

type Props = {
  className?: string;
  /** Round FAB on the right edge (Cookie Auto tab). */
  variant?: "inline" | "fab";
  icon?: LucideIcon;
};

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      <div className="space-y-2 text-[13px] leading-relaxed text-[var(--muted)]">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/25 text-[11px] font-semibold text-indigo-200">
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

export function CookieExtensionGuideButton({
  className = "",
  variant = "inline",
  icon: FabIcon = BookOpen,
}: Props) {
  const [open, setOpen] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const release = useExtensionRelease();
  const cookieUrl = cookieScreenUrl();

  const onDownloadZip = () => {
    if (zipBusy) return;
    setZipBusy(true);
    void (async () => {
      try {
        const latest = await fetchLatestExtensionRelease();
        await triggerExtensionZipDownload(latest);
      } finally {
        setZipBusy(false);
      }
    })();
  };

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[1200] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Cookie Auto Extension guide"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div className="flex max-h-[min(88vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-2xl shadow-black/50">
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Cookie size={16} className="text-violet-400" aria-hidden />
                    <h2 className="text-base font-semibold text-[var(--text)]">
                      Cookie Auto Extension — Install &amp; Usage
                    </h2>
                    <span className="rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-100">
                      v{release.version}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--muted)]">
                    E0001 Cookie Bridge · Load unpacked (no Chrome Web Store)
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                  onClick={() => setOpen(false)}
                  aria-label="Close guide"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <GuideSection title="Before you start">
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Use Google Chrome (or Chromium) with a dedicated profile per machine/user (e.g. 0010, 0100, 0888).</li>
                    <li>Sign in to Data Box at{" "}
                      <a
                        href={cookieUrl}
                        className="text-indigo-300 underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {cookieUrl}
                      </a>
                      .
                    </li>
                    <li>Repeat install + link steps once per Chrome profile.</li>
                  </ul>
                </GuideSection>

                <GuideSection title="Install the extension">
                  <ol className="space-y-2.5">
                    <Step n={1}>
                      Click the header button{" "}
                      <strong className="text-[var(--text)]">Cookie Auto Extension</strong> (or{" "}
                      <strong className="text-[var(--text)]">Download ZIP</strong> below) to fetch the latest{" "}
                      <code className="rounded bg-white/5 px-1 text-[12px]">{release.zipName}</code> from GitHub
                      Releases.
                    </Step>
                    <Step n={2}>
                      Extract the ZIP to a permanent folder, e.g.{" "}
                      <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-indigo-100">
                        C:\Tools\E0001-cookie-bridge
                      </code>
                      . Keep this folder — Chrome loads from it directly.
                    </Step>
                    <Step n={3}>
                      Open{" "}
                      <a
                        href="chrome://extensions"
                        className="font-medium text-indigo-300 hover:underline"
                      >
                        chrome://extensions
                      </a>
                      .
                    </Step>
                    <Step n={4}>
                      Enable <strong className="text-[var(--text)]">Developer mode</strong> (top-right toggle).
                    </Step>
                    <Step n={5}>
                      Click <strong className="text-[var(--text)]">Load unpacked</strong> and select the extracted folder (must contain <code className="rounded bg-white/5 px-1 text-[12px]">manifest.json</code>).
                    </Step>
                    <Step n={6}>
                      Pin the extension if needed. Confirm version <strong className="text-[var(--text)]">v{release.version}</strong> on the card.
                    </Step>
                  </ol>
                </GuideSection>

                <GuideSection title="Link extension to Data Box">
                  <ol className="space-y-2.5">
                    <Step n={1}>
                      In the same Chrome profile, open{" "}
                      <a
                        href={cookieUrl}
                        className="font-medium text-indigo-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cookie Auto
                      </a>{" "}
                      and sign in.
                    </Step>
                    <Step n={2}>
                      In the search bar toolbar, open the bridge menu and click{" "}
                      <strong className="text-[var(--text)]">Link extension</strong>. Allow the permission prompt if shown.
                    </Step>
                    <Step n={3}>
                      Check <strong className="text-[var(--text)]">Browser agents</strong> — your profile should appear as connected.
                    </Step>
                    <Step n={4}>
                      Repeat on every other Chrome profile that should sync cookies.
                    </Step>
                  </ol>
                </GuideSection>

                <GuideSection title="Daily usage">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>
                      <strong className="text-[var(--text)]">Routes table</strong> — bind a domain to a note; cloud routes push to all linked browsers via realtime.
                    </li>
                    <li>
                      <strong className="text-[var(--text)]">Sync now</strong> — owner route only; uploads the current site cookie jar to the vault (latest wins).
                    </li>
                    <li>
                      <strong className="text-[var(--text)]">Load cookies</strong> (extension popup) — applies the newest vault snapshot for the active route/domain.
                    </li>
                    <li>
                      <strong className="text-[var(--text)]">Source lock</strong> — one browser owns writes; others stay read-only for that route.
                    </li>
                    <li>
                      Open <strong className="text-[var(--text)]">Cookie settings</strong> (gear) for realtime sync, vault sync, and bridge role.
                    </li>
                  </ul>
                </GuideSection>

                <GuideSection title="Download links">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>
                      Release page:{" "}
                      <a
                        href={release.releasePage}
                        className="font-medium text-indigo-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {release.releasePage}
                      </a>
                    </li>
                    <li>
                      Direct ZIP (fallback):{" "}
                      <a
                        href={release.zipUrl}
                        className="font-medium text-indigo-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {release.zipName}
                      </a>
                    </li>
                  </ul>
                </GuideSection>

                <GuideSection title="Update to a new version">
                  <ol className="space-y-2 pl-0">
                    <Step n={1}>Download the new ZIP from Releases and extract to the same or a new folder.</Step>
                    <Step n={2}>
                      On <code className="rounded bg-white/5 px-1 text-[12px]">chrome://extensions</code>, click{" "}
                      <strong className="text-[var(--text)]">Reload</strong> on E0001, or remove and Load unpacked again pointing at the new folder.
                    </Step>
                    <Step n={3}>Refresh Cookie Auto and verify header shows the new version.</Step>
                  </ol>
                </GuideSection>
              </div>

              <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-5 py-3">
                <button
                  type="button"
                  disabled={zipBusy}
                  onClick={onDownloadZip}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60"
                >
                  <Download size={14} />
                  {zipBusy ? "Downloading…" : "Download ZIP"}
                </button>
                <a
                  href={release.releasePage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <ExternalLink size={14} />
                  All releases
                </a>
                <button
                  type="button"
                  className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  const trigger =
    variant === "fab" ? (
      <button
        type="button"
        className={`workspace-fab workspace-fab--guide ${className}`.trim()}
        onClick={() => setOpen(true)}
        title="Install & usage guide"
        aria-label="Open Cookie Auto Extension install and usage guide"
      >
        <FabIcon size={14} strokeWidth={2.4} aria-hidden />
      </button>
    ) : (
      <button
        type="button"
        className={`inline-flex h-7 items-center gap-1 rounded-lg border border-indigo-400/35 bg-indigo-500/15 px-2 text-[11px] font-medium text-indigo-100 transition-colors hover:bg-indigo-500/25 hover:text-white ${className}`.trim()}
        onClick={() => setOpen(true)}
        title="Install & usage guide"
        aria-label="Open Cookie Auto Extension install and usage guide"
      >
        <BookOpen size={13} aria-hidden />
        <span>Guide</span>
      </button>
    );

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}
