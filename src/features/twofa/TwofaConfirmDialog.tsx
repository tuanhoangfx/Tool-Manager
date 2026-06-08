import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
  danger?: boolean;
  headerIcon?: LucideIcon;
  headerIconClassName?: string;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirm action — golden HubToolDetailModal shell (--hub-modal-*). */
export function TwofaConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
  headerIcon: HeaderIcon = AlertTriangle,
  headerIconClassName = "text-rose-300",
  onConfirm,
  onClose,
}: Props) {
  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      titleId="twofa-confirm-title"
      headerIcon={HeaderIcon}
      headerIconClassName={headerIconClassName}
      shellClassName="hub-tool-detail-modal--fit"
      ariaLabelledBy="twofa-confirm-title"
      footer={
        <>
          <HubToolDetailModalSecondaryAction label="Cancel" onClick={onClose} />
          <HubToolDetailModalPrimaryAction
            label={confirmLabel}
            onClick={onConfirm}
            danger={danger}
            icon={danger ? Trash2 : HeaderIcon}
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
