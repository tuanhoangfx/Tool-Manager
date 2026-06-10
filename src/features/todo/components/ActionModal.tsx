import { useEffect, useCallback, type ReactNode } from "react";
import { HubDetailModal } from "@tool-workspace/hub-ui";
import { useSettings } from "../context/SettingsContext";

export interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  children?: ReactNode;
  maxWidth?: string;
}

/** Confirm / alert dialog — golden HubDetailModal shell. */
const ActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmButtonClass = "",
  children,
  maxWidth = "max-w-md",
}: ActionModalProps) => {
  const { t } = useSettings();

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
      onClose();
    }
  }, [onConfirm, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && onConfirm && !children) {
        event.preventDefault();
        handleConfirm();
      }
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, children, handleConfirm]);

  const confirmClass = [
    "hub-tool-detail-modal__confirm min-w-[6rem]",
    confirmButtonClass.includes("rose") || confirmButtonClass.includes("red")
      ? "hub-tool-detail-modal__confirm--danger"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <HubDetailModal
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="action-modal-title"
      shellClassName={`hub-tool-detail-modal--fit w-full ${maxWidth}`}
      header={
        <div className="user-access-modal__header">
          <div className="user-access-modal__header-main min-w-0">
            <h2 id="action-modal-title" className="truncate text-lg font-bold text-[var(--text)]">
              {title}
            </h2>
          </div>
        </div>
      }
      footer={
        !children ? (
          <div className="hub-tool-detail-modal__footer">
            <div className="hub-tool-detail-modal__footer-inner !justify-end">
              {onConfirm ? (
                <button type="button" onClick={onClose} className="hub-tool-detail-modal__secondary">
                  {cancelText || t.cancel}
                </button>
              ) : null}
              <button type="button" onClick={onConfirm ? handleConfirm : onClose} className={confirmClass}>
                {onConfirm ? confirmText || t.save : t.close}
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="modal-shell__scroll px-6 py-4">
        {message ? <p className="whitespace-pre-line text-sm text-[var(--muted)]">{message}</p> : null}
        {children}
      </div>
    </HubDetailModal>
  );
};

export default ActionModal;
