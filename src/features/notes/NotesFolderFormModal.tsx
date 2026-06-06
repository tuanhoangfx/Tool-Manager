import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { HubDetailModal } from "@tool-workspace/hub-ui";
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

  return (
    <HubDetailModal
      open={open}
      onClose={onClose}
      size="compact"
      ariaLabelledBy="notes-folder-form-title"
      header={
        <header className="user-access-modal__header">
          <div className="auth-gate-icon h-8 w-8 shrink-0 rounded-lg" aria-hidden>
            <FolderOpen size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="notes-folder-form-title" className="truncate text-sm font-semibold text-[var(--text)]">
              {mode === "add" ? "Add folder" : "Edit folder"}
            </h2>
            <p className="truncate text-[10px] text-[var(--muted)]">
              {mode === "add"
                ? "Create a folder to tag notes and filter the list from the header bar."
                : "Update folder name and color."}
            </p>
          </div>
        </header>
      }
      footer={
        <footer className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" className="auth-gate-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="auth-gate-submit" disabled={busy} onClick={() => void submit()}>
            {busy ? "Please wait…" : mode === "add" ? "Add folder" : "Save changes"}
          </button>
        </footer>
      }
    >
      <div className="space-y-4 p-4">
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
      </div>
    </HubDetailModal>
  );
}
