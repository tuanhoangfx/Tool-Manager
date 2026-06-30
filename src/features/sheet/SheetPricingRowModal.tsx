import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  HubOpsFormField,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HubToolDetailSections,
} from "@tool-workspace/hub-ui";
import type { PricingCatalogRow } from "./pricing-catalog-edit";

const EMPTY_ROW: PricingCatalogRow = {
  platformKey: "",
  platformLabel: "",
  header: "",
  packages: "",
  extras: "",
  followUp: "",
};

export function SheetPricingRowModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  mode: "add" | "edit";
  initial?: PricingCatalogRow | null;
  onClose: () => void;
  onSave: (row: PricingCatalogRow) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [row, setRow] = useState<PricingCatalogRow>(EMPTY_ROW);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRow(initial ? { ...initial } : { ...EMPTY_ROW });
    setError(null);
    setBusy(false);
  }, [initial, open]);

  const submit = useCallback(async () => {
    setError(null);
    if (!row.platformLabel.trim()) {
      setError("Platform name is required.");
      return;
    }
    setBusy(true);
    try {
      await onSave(row);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e ?? "Save failed."));
    } finally {
      setBusy(false);
    }
  }, [onClose, onSave, row]);

  const remove = useCallback(async () => {
    if (!onDelete) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e ?? "Delete failed."));
    } finally {
      setBusy(false);
    }
  }, [onClose, onDelete]);

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add pricing row" : "Edit pricing row"}
      headerIcon={mode === "add" ? Plus : Pencil}
      headerIconClassName="text-emerald-300"
      size="detail"
      footer={
        <>
          {mode === "edit" && onDelete ? (
            <HubToolDetailModalSecondaryAction
              label="Delete row"
              onClick={() => void remove()}
              disabled={busy}
            />
          ) : null}
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} disabled={busy} />
          <HubToolDetailModalPrimaryAction
            label={mode === "add" ? "Add row" : "Save"}
            onClick={() => void submit()}
            disabled={busy}
            busy={busy}
          />
        </>
      }
    >
      <HubToolDetailSections>
        <HubToolDetailSection id="pricing-row" title="Product" icon={<Pencil size={14} aria-hidden />}>
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted)]">
              Native SSOT sheet — changes sync to Supabase and bots using this catalog.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <HubOpsFormField label="Platform" hint="Display name (e.g. Capcut)">
                <input
                  className="field w-full text-xs"
                  value={row.platformLabel}
                  onChange={(e) => setRow((p) => ({ ...p, platformLabel: e.target.value }))}
                />
              </HubOpsFormField>
              <HubOpsFormField label="Key" hint="Match key for bot lookup">
                <input
                  className="field w-full text-xs"
                  value={row.platformKey}
                  onChange={(e) => setRow((p) => ({ ...p, platformKey: e.target.value }))}
                  placeholder="capcut"
                />
              </HubOpsFormField>
            </div>
            <HubOpsFormField label="Header" hint="First line of bot reply (e.g. 💳 Capcut Pro)">
              <input
                className="field w-full text-xs"
                value={row.header}
                onChange={(e) => setRow((p) => ({ ...p, header: e.target.value }))}
              />
            </HubOpsFormField>
            <HubOpsFormField label="Packages" hint="One package per line, optional • prefix">
              <textarea
                className="field min-h-[6rem] w-full resize-y text-xs"
                value={row.packages}
                onChange={(e) => setRow((p) => ({ ...p, packages: e.target.value }))}
                rows={5}
              />
            </HubOpsFormField>
            <HubOpsFormField label="Warranty / Extras">
              <textarea
                className="field min-h-[4rem] w-full resize-y text-xs"
                value={row.extras}
                onChange={(e) => setRow((p) => ({ ...p, extras: e.target.value }))}
                rows={3}
              />
            </HubOpsFormField>
            <HubOpsFormField label="Follow-up" hint="Second bot message after pricing card">
              <input
                className="field w-full text-xs"
                value={row.followUp}
                onChange={(e) => setRow((p) => ({ ...p, followUp: e.target.value }))}
              />
            </HubOpsFormField>
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          </div>
        </HubToolDetailSection>
      </HubToolDetailSections>
    </HubToolDetailModal>
  );
}
