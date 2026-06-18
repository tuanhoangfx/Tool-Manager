import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, Link2, Table2 } from "lucide-react";
import {
  HubOpsFormField,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HubToolDetailSections,
  HubTocSectionNav,
  type HubTocNavItem,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import { parseGoogleSheetLink, toGoogleSheetCsvUrl } from "./google-sheet-link";
import { fetchSheetTabTitle } from "./sheet-tab-title";
import type { SheetTitleSource } from "./sheet-sources";

export type SheetImportModalResult = {
  title: string;
  rawUrl: string;
  csvUrl: string;
  gid: string;
  titleSource: SheetTitleSource;
};

const SHEET_IMPORT_SECTIONS: readonly HubTocNavItem[] = [
  { id: "sheet-import-link", label: "Link", icon: <Link2 size={12} aria-hidden /> },
] as const;

export function SheetImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (result: SheetImportModalResult) => void;
}) {
  const [title, setTitle] = useState("");
  const [rawUrl, setRawUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(null);
  const [resolvingTitle, setResolvingTitle] = useState(false);
  const titleEditedRef = useRef(false);
  const sectionIds = useMemo(() => SHEET_IMPORT_SECTIONS.map((s) => s.id), []);

  const normalizedRaw = useMemo(() => rawUrl.replace(/^undefined+/i, "").trim(), [rawUrl]);
  const info = useMemo(() => parseGoogleSheetLink(normalizedRaw), [normalizedRaw]);
  const csv = useMemo(() => (normalizedRaw ? toGoogleSheetCsvUrl(normalizedRaw) : null), [normalizedRaw]);
  const linkOk = Boolean(csv?.ok);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setRawUrl("");
    setError(null);
    setResolvedTitle(null);
    setResolvingTitle(false);
    titleEditedRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open || !linkOk || !normalizedRaw) {
      setResolvedTitle(null);
      setResolvingTitle(false);
      return;
    }
    let cancelled = false;
    setResolvingTitle(true);
    const gid = info.gid ?? "0";
    const timer = window.setTimeout(() => {
      void fetchSheetTabTitle({ rawUrl: normalizedRaw, gid })
        .then((name) => {
          if (cancelled) return;
          setResolvedTitle(name);
          if (name && !titleEditedRef.current) setTitle(name);
        })
        .finally(() => {
          if (!cancelled) setResolvingTitle(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [info.gid, linkOk, normalizedRaw, open]);

  const submit = useCallback(async () => {
    setError(null);
    if (!normalizedRaw) return;
    if (!csv || !csv.ok) {
      setError(csv && !csv.ok ? csv.error : "Missing link.");
      return;
    }
    const gid = info.gid ?? "0";
    const manualTitle = title.trim();
    const autoTitle =
      resolvedTitle ??
      (manualTitle ? null : await fetchSheetTabTitle({ rawUrl: normalizedRaw, gid }));
    const finalTitle = manualTitle || autoTitle || `Sheet gid:${gid}`;
    const titleSource: SheetTitleSource =
      titleEditedRef.current && manualTitle ? "manual" : "auto";
    onImport({
      title: finalTitle,
      rawUrl: normalizedRaw,
      csvUrl: csv.url,
      gid,
      titleSource,
    });
    onClose();
  }, [csv, info.gid, normalizedRaw, onClose, onImport, resolvedTitle, title]);

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="Import sheet"
      headerIcon={Table2}
      headerIconClassName="text-cyan-300"
      shellClassName="hub-tool-detail-modal--fit"
      size="detail"
      toc={<HubTocSectionNav items={SHEET_IMPORT_SECTIONS} scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT} />}
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} />
          <HubToolDetailModalPrimaryAction
            label="Add sheet"
            icon={FilePlus2}
            onClick={() => void submit()}
            disabled={!normalizedRaw || !linkOk || resolvingTitle}
            busy={resolvingTitle}
          />
        </>
      }
    >
      <HubToolDetailSections>
        <HubToolDetailSection id="sheet-import-link" title="Link" icon={<Link2 size={14} aria-hidden />}>
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted)]">
              Paste a Google Sheet link with <code className="text-indigo-200">gid</code>. Tab name is detected
              automatically — edit the title if needed.
            </p>

            <HubOpsFormField label="Google Sheet link" hint="Paste /edit#gid=… or /pubhtml?gid=…" icon={Link2}>
              <textarea
                className="field min-h-[4.5rem] w-full resize-y text-xs"
                value={rawUrl}
                onChange={(e) => setRawUrl(e.target.value.replace(/^undefined+/i, ""))}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=1075393871"
                rows={3}
                autoFocus
              />
            </HubOpsFormField>

            <HubOpsFormField
              label="Title"
              hint={
                resolvingTitle
                  ? "Resolving tab name…"
                  : resolvedTitle
                    ? `Detected: ${resolvedTitle}`
                    : "Optional — leave blank to use the detected tab name."
              }
            >
              <input
                className="field w-full text-xs"
                value={title}
                onChange={(e) => {
                  titleEditedRef.current = true;
                  setTitle(e.target.value);
                }}
                placeholder={resolvedTitle ?? "e.g. Infi Docs Import"}
              />
            </HubOpsFormField>

            {normalizedRaw ? (
              <div className="rounded-lg border border-[#2a3158] bg-[var(--panel-2)] px-3 py-2.5 text-xs">
                <p className="text-[var(--muted)]">
                  Detected: <span className="text-indigo-200">{info.kind}</span>
                  {" · "}
                  gid <span className="font-mono text-cyan-200">{info.gid ?? "0"}</span>
                </p>
                <p className="mt-1.5 text-[var(--text)]">
                  {linkOk ? (
                    resolvingTitle ? (
                      <span className="text-[var(--muted)]">Checking tab access…</span>
                    ) : (
                      <span className="text-[var(--muted)]">Link OK — ready to import.</span>
                    )
                  ) : (
                    <span className="text-rose-200">{csv && !csv.ok ? csv.error : "Invalid link."}</span>
                  )}
                </p>
              </div>
            ) : null}

            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          </div>
        </HubToolDetailSection>
      </HubToolDetailSections>
    </HubToolDetailModal>
  );
}
