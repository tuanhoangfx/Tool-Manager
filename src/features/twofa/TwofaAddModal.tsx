import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { TwofaAccount, TwofaDraft } from "./types";
import { TwofaAddForm } from "./TwofaAddForm";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial?: TwofaAccount | null;
  initialDraft?: Partial<TwofaDraft> | null;
  onClose: () => void;
  onSaveSingle: (draft: TwofaDraft) => boolean;
  onImportMany: (drafts: TwofaDraft[]) => number;
};

export function TwofaAddModal({
  open,
  mode,
  initial,
  initialDraft,
  onClose,
  onSaveSingle,
  onImportMany,
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
    <div className="auth-gate-root" role="presentation">
      <div className="auth-gate-backdrop" aria-hidden onClick={onClose} />
      <TwofaAddForm
        active
        variant="modal"
        mode={mode}
        initial={initial}
        initialDraft={initialDraft}
        onClose={onClose}
        onSaveSingle={onSaveSingle}
        onImportMany={onImportMany}
      />
    </div>,
    document.body,
  );
}
