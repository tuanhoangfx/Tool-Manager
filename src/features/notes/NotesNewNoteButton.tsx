import { useState } from "react";
import { Plus } from "lucide-react";
import { useNotes } from "./useNotes";
import { useNotesAuth } from "./useNotesAuth";

export function NotesNewNoteButton({ onCreated }: { onCreated: (noteId: string) => void }) {
  const { session } = useNotesAuth();
  const { createNote } = useNotes(session);
  const [creating, setCreating] = useState(false);

  if (!session) return null;

  return (
    <button
      type="button"
      className="btn text-[12px]"
      disabled={creating}
      onClick={() => {
        setCreating(true);
        void createNote()
          .then((row) => onCreated(row.id))
          .catch(console.error)
          .finally(() => setCreating(false));
      }}
    >
      <Plus size={14} />
      {creating ? "Creating…" : "New note"}
    </button>
  );
}
