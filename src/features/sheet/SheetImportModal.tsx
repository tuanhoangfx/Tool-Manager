import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, FilePlus2, Link2, Table2 } from "lucide-react";
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
import { catalogUrlFromId, ensurePricingCatalogExists, slugifyCatalogId } from "./pricing-catalog-edit";
import { PRICING_CATALOG_PREFIX } from "./pricing-catalog-sheet";
import type { SheetTitleSource } from "./sheet-sources";

export type SheetImportGoogleResult = {
  kind: "google";
  title: string;
  rawUrl: string;
  csvUrl: string;
  gid: string;
  titleSource: SheetTitleSource;
};

export type SheetImportNativeResult = {
  kind: "pricing-catalog";
  title: string;
  catalogId: string;
};

export type SheetImportModalResult = SheetImportGoogleResult | SheetImportNativeResult;

type ImportMode = "google" | "native";

const GOOGLE_SECTIONS: readonly HubTocNavItem[] = [
  { id: "sheet-import-link", label: "Link", icon: <Link2 size={12} aria-hidden /> },
] as const;

const NATIVE_SECTIONS: readonly HubTocNavItem[] = [
  { id: "sheet-import-native", label: "Catalog", icon: <Database size={12} aria-hidden /> },
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
  const [mode, setMode] = useState<ImportMode>("native");
  const [title, setTitle] = useState("");
  const [rawUrl, setRawUrl] = useState("");
  const [catalogId, setCatalogId] = useState("infi28-payment");
  const [error, setError] = useState<string | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(null);
  const [resolvingTitle, setResolvingTitle] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleEditedRef = useRef(false);

  const sections = mode === "google" ? GOOGLE_SECTIONS : NATIVE_SECTIONS;
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const normalizedRaw = useMemo(() => rawUrl.replace(/^undefined+/i, "").trim(), [rawUrl]);
  const info = useMemo(() => parseGoogleSheetLink(normalizedRaw), [normalizedRaw]);
  const csv = useMemo(() => (normalizedRaw ? toGoogleSheetCsvUrl(normalizedRaw) : null), [normalizedRaw]);
  const linkOk = Boolean(csv?.ok);
  const nativeCatalogId = useMemo(() => slugifyCatalogId(catalogId), [catalogId]);
  const nativeOk = nativeCatalogId.length >= 2;

  useEffect(() => {
    if (!open) return;
    setMode("native");
    setTitle("");
    setRawUrl("");
    setCatalogId("infi28-payment");
    setError(null);
    setResolvedTitle(null);
    setResolvingTitle(false);
    setBusy(false);
    titleEditedRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "google" || !linkOk || !normalizedRaw) {
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
  }, [info.gid, linkOk, mode, normalizedRaw, open]);

  const submitGoogle = useCallback(async () => {
    if (!normalizedRaw) return;
    if (!csv || !csv.ok) {
      setError(csv && !csv.ok ? csv.error : "Missing link.");
      return;
    }
    const gid = info.gid ?? "0";
    const manualTitle = title.trim();
    const autoTitle =
      resolvedTitle ?? (manualTitle ? null : await fetchSheetTabTitle({ rawUrl: normalizedRaw, gid }));
    const finalTitle = manualTitle || autoTitle || `Sheet gid:${gid}`;
    const titleSource: SheetTitleSource =
      titleEditedRef.current && manualTitle ? "manual" : "auto";
    onImport({
      kind: "google",
      title: finalTitle,
      rawUrl: normalizedRaw,
      csvUrl: csv.url,
      gid,
      titleSource,
    });
    onClose();
  }, [csv, info.gid, normalizedRaw, onClose, onImport, resolvedTitle, title]);

  const submitNative = useCallback(async () => {
    setError(null);
    const id = slugifyCatalogId(catalogId);
    if (!id) {
      setError("Catalog id is required (e.g. infi28-payment).");
      return;
    }
    const finalTitle = title.trim() || `💳 ${id} (SSOT)`;
    setBusy(true);
    try {
      await ensurePricingCatalogExists(id, finalTitle);
      onImport({ kind: "pricing-catalog", title: finalTitle, catalogId: id });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e ?? "Could not create catalog."));
    } finally {
      setBusy(false);
    }
  }, [catalogId, onClose, onImport, title]);

  const submit = useCallback(() => {
    if (mode === "google") void submitGoogle();
    else void submitNative();
  }, [mode, submitGoogle, submitNative]);

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="Add sheet"
      headerIcon={Table2}
      headerIconClassName="text-cyan-300"
      shellClassName="hub-tool-detail-modal--fit"
      size="detail"
      toc={
        <HubTocSectionNav items={sections} scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT} />
      }
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} disabled={busy} />
          <HubToolDetailModalPrimaryAction
            label={mode === "google" ? "Import Google Sheet" : "Create native sheet"}
            icon={mode === "google" ? Link2 : Database}
            onClick={() => void submit()}
            disabled={mode === "google" ? !normalizedRaw || !linkOk || resolvingTitle : !nativeOk}
            busy={busy || resolvingTitle}
          />
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`rounded-lg border px-3 py-2.5 text-left text-xs transition ${
            mode === "native"
              ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
              : "border-[#2a3158] bg-[var(--panel-2)] text-[var(--muted)] hover:border-cyan-400/20"
          }`}
          onClick={() => setMode("native")}
        >
          <span className="flex items-center gap-2 font-medium text-[var(--text)]">
            <Database size={14} aria-hidden className="text-emerald-300" />
            Independent sheet
          </span>
          <span className="mt-1 block text-[11px] leading-snug">
            Supabase SSOT — editable, used by bots via pricing catalog.
          </span>
        </button>
        <button
          type="button"
          className={`rounded-lg border px-3 py-2.5 text-left text-xs transition ${
            mode === "google"
              ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
              : "border-[#2a3158] bg-[var(--panel-2)] text-[var(--muted)] hover:border-cyan-400/20"
          }`}
          onClick={() => setMode("google")}
        >
          <span className="flex items-center gap-2 font-medium text-[var(--text)]">
            <Link2 size={14} aria-hidden className="text-sky-300" />
            Google Sheet link
          </span>
          <span className="mt-1 block text-[11px] leading-snug">
            Read-only import from a published Google Sheet CSV URL.
          </span>
        </button>
      </div>

      <HubToolDetailSections>
        {mode === "google" ? (
          <HubToolDetailSection id="sheet-import-link" title="Google link" icon={<Link2 size={14} aria-hidden />}>
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted)]">
                Paste a Google Sheet link with <code className="text-indigo-200">gid</code>. Tab name is detected
                automatically.
              </p>
              <HubOpsFormField label="Google Sheet link" hint="Paste /edit#gid=… or /pubhtml?gid=…" icon={Link2}>
                <textarea
                  className="field min-h-[4.5rem] w-full resize-y text-xs"
                  value={rawUrl}
                  onChange={(e) => setRawUrl(e.target.value.replace(/^undefined+/i, ""))}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=1075393871"
                  rows={3}
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
            </div>
          </HubToolDetailSection>
        ) : (
          <HubToolDetailSection id="sheet-import-native" title="Native catalog" icon={<Database size={14} aria-hidden />}>
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted)]">
                Creates an independent sheet backed by Supabase{" "}
                <code className="text-emerald-200">product_pricing</code>. Bots read this catalog — not Google CSV.
              </p>
              <HubOpsFormField label="Catalog id" hint={`Stored as ${PRICING_CATALOG_PREFIX}<id>`} icon={Database}>
                <input
                  className="field w-full font-mono text-xs"
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                  placeholder="infi28-payment"
                />
              </HubOpsFormField>
              <HubOpsFormField label="Title" hint="Shown in the sheet rail">
                <input
                  className="field w-full text-xs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="💳 Infi28 Pricing (SSOT)"
                />
              </HubOpsFormField>
              {nativeOk ? (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-100">
                  URL: <span className="font-mono">{catalogUrlFromId(nativeCatalogId)}</span>
                </div>
              ) : (
                <p className="text-xs text-rose-300">Catalog id must be at least 2 characters (a-z, 0-9, hyphen).</p>
              )}
            </div>
          </HubToolDetailSection>
        )}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </HubToolDetailSections>
    </HubToolDetailModal>
  );
}
