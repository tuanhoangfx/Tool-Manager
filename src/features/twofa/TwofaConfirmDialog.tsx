import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";
import "./twofa-confirm.css";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function TwofaConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("hub-modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("hub-modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="auth-gate-root twofa-confirm-root" role="presentation">
      <div className="auth-gate-backdrop" aria-hidden onClick={onClose} />
      <div
        className="auth-gate-modal twofa-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="twofa-confirm-title"
        aria-describedby="twofa-confirm-desc"
      >
        <button type="button" className="auth-gate-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className="twofa-confirm-body">
          <div className="twofa-confirm-icon" aria-hidden>
            <AlertTriangle size={22} />
          </div>
          <h2 id="twofa-confirm-title" className="auth-gate-title twofa-confirm-title">
            {title}
          </h2>
          <div id="twofa-confirm-desc" className="twofa-confirm-message">
            {message}
          </div>
        </div>

        <div className="auth-gate-actions twofa-confirm-actions">
          <button type="button" className="auth-gate-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="twofa-confirm-danger" onClick={onConfirm}>
            <Trash2 size={14} aria-hidden />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
