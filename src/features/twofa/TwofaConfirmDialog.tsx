import type { ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
} from "@tool-workspace/hub-ui";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirm delete — golden HubToolDetailModal compact shell. */
export function TwofaConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: Props) {
  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      titleId="twofa-confirm-title"
      headerIcon={AlertTriangle}
      headerIconClassName="text-rose-300"
      shellClassName="hub-header-panel-modal"
      size="compact"
      ariaLabelledBy="twofa-confirm-title"
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} />
          <HubToolDetailModalPrimaryAction
            label={confirmLabel}
            onClick={onConfirm}
            danger
            icon={Trash2}
          />
        </>
      }
    >
      <div id="twofa-confirm-desc" className="px-1 text-center text-sm leading-relaxed text-[var(--muted)]">
        {message}
      </div>
    </HubToolDetailModal>
  );
}
