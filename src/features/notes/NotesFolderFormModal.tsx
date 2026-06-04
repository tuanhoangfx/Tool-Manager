import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FolderOpen, X } from "lucide-react";
import { NOTE_FOLDER_COLORS, type NoteFolder } from "./noteFolders";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial?: NoteFolder | null;
  onClose: () => void;
  onSave: (draft: { name: string; color: string }) => Promise<void>;
};

export function NotesFolderFormModal({ open, mode, initial, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(NOTE_FOLDER_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(initial?.name ?? "");
    setColor(initial?.color ?? NOTE_FOLDER_COLORS[0]);
  }, [initial, open]);

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
  }, [onClose, open]);

  const submit = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setError("Folder name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({ name: nextName, color });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save folder.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="auth-gate-root" role="presentation">
      <div className="auth-gate-backdrop" aria-hidden onClick={onClose} />
      <div className="auth-gate-modal" role="dialog" aria-modal="true" aria-labelledby="notes-folder-form-title">
        <button type="button" className="auth-gate-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className="auth-gate-brand">
          <div className="auth-gate-icon" aria-hidden>
            <FolderOpen size={20} />
          </div>
        </div>

        <h2 id="notes-folder-form-title" className="auth-gate-title">
          {mode === "add" ? "Add folder" : "Edit folder"}
        </h2>
        <p className="auth-gate-subtitle">
          {mode === "add"
            ? "Create a folder to tag notes and filter the list from the header bar."
            : "Update folder name and color."}
        </p>

        <div className="auth-gate-form">
          <input
            className="field auth-gate-field w-full"
            placeholder="Folder name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />

          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Color</span>
            <div className="flex flex-wrap gap-2">
              {NOTE_FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c ? "border-white shadow-md shadow-black/30" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {error ? <p className="auth-gate-message">{error}</p> : null}

          <div className="auth-gate-actions">
            <button type="button" className="auth-gate-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="auth-gate-submit" disabled={busy} onClick={() => void submit()}>
              {busy ? "Please wait…" : mode === "add" ? "Add folder" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
