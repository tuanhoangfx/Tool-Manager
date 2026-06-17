import { useCallback, useMemo, useState } from "react";
import { FilePlus2, Table2 } from "lucide-react";
import { HubFormFieldLabel, HubToolDetailModal, HubToolDetailModalPrimaryAction, HubToolDetailModalSecondaryAction } from "@tool-workspace/hub-ui";
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

  const normalizedRaw = useMemo(() => rawUrl.replace(/^undefined+/i, "").trim(), [rawUrl]);
  const info = useMemo(() => parseGoogleSheetLink(normalizedRaw), [normalizedRaw]);
  const csv = useMemo(() => (normalizedRaw ? toGoogleSheetCsvUrl(normalizedRaw) : null), [normalizedRaw]);

  const submit = useCallback(async () => {
    setError(null);
    if (!normalizedRaw) return;
    if (!csv || !csv.ok) {
      setError(csv && !csv.ok ? csv.error : "Missing link.");
      return;
    }
    const gid = info.gid ?? "0";
    const manualTitle = title.trim();
    const titleFromLink = manualTitle
      ? null
      : await fetchSheetTabTitle({ rawUrl: normalizedRaw, gid });
    onImport({
      title: manualTitle || titleFromLink || `Sheet gid:${gid}`,
      rawUrl: normalizedRaw,
      csvUrl: csv.url,
      gid,
      titleSource: manualTitle ? "manual" : "auto",
    });
    setTitle("");
    setRawUrl("");
    onClose();
  }, [csv, info, normalizedRaw, onClose, onImport, title]);

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="Import sheet"
      headerIcon={Table2}
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} />
          <HubToolDetailModalPrimaryAction
            label="Add sheet"
            icon={FilePlus2}
            onClick={submit}
            disabled={!normalizedRaw || !csv?.ok}
          />
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <HubFormFieldLabel>Title (optional)</HubFormFieldLabel>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[.03] px-2 py-2 text-[12px] text-[var(--text)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Czp Docs Import"
          />
        </label>

        <label className="block">
          <HubFormFieldLabel>Google Sheet link (with gid)</HubFormFieldLabel>
          <textarea
            className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/[.03] px-2 py-2 text-[12px] text-[var(--text)]"
            value={rawUrl}
            onChange={(e) => setRawUrl(e.target.value.replace(/^undefined+/i, ""))}
            placeholder="Paste /edit#gid=... or /pubhtml?gid=..."
            rows={3}
          />
        </label>

        {normalizedRaw ? (
          <div className="rounded-xl border border-white/10 bg-white/[.02] p-3 text-[11px] text-[var(--muted)]">
            <p>
              Detected: <code className="text-indigo-200">{info.kind}</code> · gid{" "}
              <code className="text-indigo-200">{info.gid ?? "0"}</code>
            </p>
            <p className="mt-1">
              CSV:{" "}
              <code className="break-all text-cyan-200">{csv && csv.ok ? csv.url : "—"}</code>
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
            {error}
          </p>
        ) : null}
      </div>
    </HubToolDetailModal>
  );
}
