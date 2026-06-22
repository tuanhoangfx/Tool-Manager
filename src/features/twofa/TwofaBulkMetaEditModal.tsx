import { useEffect, useState } from "react";
import { Save, StickyNote, Tags } from "lucide-react";
import {
  HubFormFieldLabel,
  HubSingleFilterDropdown,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
} from "@tool-workspace/hub-ui";
import {
  DEFAULT_TWOFA_ACCOUNT_STATUS,
  twofaStatusFilterOptions,
  type TwofaAccountStatus,
} from "./twofa-account-status";
import type { TwofaBulkMetaPatch } from "./twofa-upsert-accounts";

type Props = {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onApply: (patch: TwofaBulkMetaPatch) => number;
};

/** Bulk edit status and/or note for multi-selected vault rows. */
export function TwofaBulkMetaEditModal({ open, selectedCount, onClose, onApply }: Props) {
  const [applyStatus, setApplyStatus] = useState(false);
  const [status, setStatus] = useState<TwofaAccountStatus>(DEFAULT_TWOFA_ACCOUNT_STATUS);
  const [applyNote, setApplyNote] = useState(false);
  const [note, setNote] = useState("");
  const [clearNote, setClearNote] = useState(false);
  const [appendNote, setAppendNote] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApplyStatus(false);
    setStatus(DEFAULT_TWOFA_ACCOUNT_STATUS);
    setApplyNote(false);
    setNote("");
    setClearNote(false);
    setAppendNote(false);
    setBusy(false);
  }, [open]);

  if (!open) return null;

  const canApply = (applyStatus || applyNote) && !busy;

  const handleApply = () => {
    if (!canApply) return;
    setBusy(true);
    const patch: TwofaBulkMetaPatch = {};
    if (applyStatus) patch.status = status;
    if (applyNote) {
      if (clearNote) patch.clearNote = true;
      else {
        patch.note = note;
        if (appendNote) patch.appendNote = true;
      }
    }
    onApply(patch);
    setBusy(false);
    onClose();
  };

  return (
    <HubToolDetailModal
      open
      onClose={onClose}
      title={`Edit ${selectedCount} accounts`}
      titleId="twofa-bulk-meta-title"
      headerIcon={Tags}
      headerIconClassName="text-indigo-300"
      shellClassName="hub-header-panel-modal twofa-bulk-meta-modal"
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} disabled={busy} />
          <HubToolDetailModalPrimaryAction
            label={busy ? "Applying…" : "Apply"}
            icon={Save}
            onClick={handleApply}
            disabled={!canApply}
            busy={busy}
          />
        </>
      }
      ariaLabelledBy="twofa-bulk-meta-title"
    >
      <HubToolDetailSection title="Status & note" icon={<Tags size={14} aria-hidden />}>
        <div className="space-y-4 text-[12px]">
          <p className="text-[var(--muted)]">
            Changes apply to all <strong className="text-[var(--text)]">{selectedCount}</strong> selected
            accounts. Each field logs an audit entry.
          </p>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="hub-checkbox mt-0.5"
              checked={applyStatus}
              onChange={(e) => setApplyStatus(e.target.checked)}
            />
            <span className="min-w-0 flex-1 space-y-2">
              <HubFormFieldLabel icon={Tags} iconClassName="text-emerald-300">
                Status
              </HubFormFieldLabel>
              <HubSingleFilterDropdown
                filterKey="twofa-bulk-status"
                label="Status"
                options={twofaStatusFilterOptions()}
                value={status}
                onChange={(value) => setStatus(value as TwofaAccountStatus)}
                disabled={!applyStatus}
                triggerFormat="value"
                className="w-full max-w-xs"
              />
            </span>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="hub-checkbox mt-0.5"
              checked={applyNote}
              onChange={(e) => setApplyNote(e.target.checked)}
            />
            <span className="min-w-0 flex-1 space-y-2">
              <HubFormFieldLabel icon={StickyNote} iconClassName="text-emerald-300">
                Note
              </HubFormFieldLabel>
              <label className="mb-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={clearNote}
                  disabled={!applyNote}
                  onChange={(e) => {
                    setClearNote(e.target.checked);
                    if (e.target.checked) setAppendNote(false);
                  }}
                />
                Clear note on all selected
              </label>
              <label className="mb-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={appendNote}
                  disabled={!applyNote || clearNote}
                  onChange={(e) => setAppendNote(e.target.checked)}
                />
                Append to existing note
              </label>
              <input
                className="field auth-gate-field w-full"
                name="twofa-bulk-note"
                autoComplete="off"
                placeholder="Optional"
                value={note}
                disabled={!applyNote || clearNote}
                onChange={(e) => setNote(e.target.value)}
              />
            </span>
          </label>
        </div>
      </HubToolDetailSection>
    </HubToolDetailModal>
  );
}
