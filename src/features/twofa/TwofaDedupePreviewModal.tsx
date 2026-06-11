import { CopyMinus, Loader2 } from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "@tool-workspace/hub-ui";
import type { TwofaDedupePreview } from "./twofa-upsert-accounts";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import "./twofa-dedupe-preview.css";

type Props = {
  open: boolean;
  loading: boolean;
  running: boolean;
  preview: TwofaDedupePreview | null;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function TwofaDedupePreviewModal({
  open,
  loading,
  running,
  preview,
  error,
  onConfirm,
  onClose,
}: Props) {
  const maxCount = preview?.byService[0]?.count ?? 1;
  const total = preview?.totalRemoved ?? 0;

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="Remove duplicate accounts?"
      titleId="twofa-dedupe-preview-title"
      headerIcon={CopyMinus}
      headerIconClassName="text-amber-300"
      shellClassName="hub-tool-detail-modal--fit twofa-dedupe-preview-modal"
      ariaLabelledBy="twofa-dedupe-preview-title"
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} disabled={running} />
          <HubToolDetailModalPrimaryAction
            label={
              running
                ? "Removing…"
                : total > 0
                  ? `Remove ${total} duplicate${total === 1 ? "" : "s"}`
                  : "Remove duplicates"
            }
            onClick={onConfirm}
            danger
            disabled={loading || running || !preview || total === 0}
            icon={CopyMinus}
          />
        </>
      }
    >
      <div className="twofa-dedupe-preview-modal__body px-1 text-sm text-[var(--muted)]">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-6 text-center">
            <Loader2 size={16} className="animate-spin text-amber-300" aria-hidden />
            Scanning cloud vault and local cache…
          </p>
        ) : error ? (
          <p className="py-4 text-center text-rose-300">{error}</p>
        ) : preview && total > 0 ? (
          <>
            <p className="mb-4 text-center leading-relaxed">
              Found <strong className="text-[var(--text)]">{total}</strong> duplicate account
              {total === 1 ? "" : "s"} to remove. Keeps the newest entry per identity (platform + account
              + browser).
            </p>
            <div className="twofa-dedupe-preview-modal__list" role="list">
              {preview.byService.map((row) => {
                const width = Math.max(12, Math.round((row.count / maxCount) * 100));
                return (
                  <div key={row.service} className="twofa-dedupe-preview-modal__row" role="listitem">
                    <span className="twofa-dedupe-preview-modal__service">
                      <TwofaPlatformIcon service={row.service} />
                      <span className="truncate">{row.service}</span>
                    </span>
                    <span className="twofa-dedupe-preview-modal__bar-wrap" aria-hidden>
                      <span
                        className="twofa-dedupe-preview-modal__bar"
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span className="twofa-dedupe-preview-modal__count tabular-nums">{row.count}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="py-4 text-center">No duplicate accounts found.</p>
        )}
      </div>
    </HubToolDetailModal>
  );
}
