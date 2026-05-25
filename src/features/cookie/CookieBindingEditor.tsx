import { Plus, Trash2 } from "lucide-react";
import type { NoteListItem } from "../notes/types";
import { DOMAIN_PRESETS, type CookieBinding } from "./cookieBridge";
import { Glass, StatusBadge } from "../../theme/p0008";

type Props = {
  bindings: CookieBinding[];
  notes: NoteListItem[];
  onAdd: (noteId: string, domain: string, pass: string) => void;
  onUpdate: (id: string, patch: Partial<CookieBinding>) => void;
  onRemove: (id: string) => void;
  onPushExtension: () => void;
};

export function CookieBindingEditor({ bindings, notes, onAdd, onUpdate, onRemove, onPushExtension }: Props) {
  const notesForBind = notes.length ? notes : [];
  const passMismatches = bindings.filter((b) => {
    const note = notes.find((n) => n.id === b.noteId);
    return note?.sync_pass_hash && !(b.pass ?? "").trim();
  });

  return (
    <Glass tone="indigo" label="Domain → Note bindings">
      <p className="mb-3 text-[11px] text-[var(--muted)]">
        Pick a source domain (cookie jar) and target note (Sync ID or note UUID). Save pushes config to P0020-cookie-bridge.
      </p>
      {passMismatches.length ? (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          {passMismatches.length} binding(s) missing sync pass — extension sync will fail until you enter the pass from the note.
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {DOMAIN_PRESETS.map((p) => (
          <button
            key={p.domain}
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-[var(--muted)] hover:border-indigo-400/40 hover:text-indigo-200"
            title={p.domain}
            onClick={() => {
              const first = notesForBind[0];
              if (first) onAdd(first.id, p.domain, "");
            }}
          >
            + {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {bindings.map((b) => {
          const note = notes.find((n) => n.id === b.noteId);
          const syncTone = note?.syncTone ?? "amber";
          return (
            <div key={b.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={b.enabled}
                    onChange={(e) => onUpdate(b.id, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <button type="button" className="btn-ghost btn !px-2 text-rose-300" onClick={() => onRemove(b.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[9px] uppercase text-[var(--muted)]">Target note</label>
                  <select
                    className="field mt-0.5 w-full text-[11px]"
                    value={b.noteId}
                    onChange={(e) => onUpdate(b.id, { noteId: e.target.value })}
                  >
                    {notesForBind.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} · {n.sync_id || `${n.id.slice(0, 8)}…`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase text-[var(--muted)]">Sync ID</label>
                  <code className="field mt-0.5 block font-mono text-[10px] text-cyan-200">{b.syncId}</code>
                </div>
                <div>
                  <label className="text-[9px] uppercase text-[var(--muted)]">Cookie domain</label>
                  <input
                    className="field mt-0.5 font-mono text-[11px]"
                    placeholder=".zalo.me"
                    value={b.domain}
                    onChange={(e) => onUpdate(b.id, { domain: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase text-[var(--muted)]">Sync pass (optional)</label>
                  <input
                    className="field mt-0.5 text-[11px]"
                    type="password"
                    placeholder={note?.sync_pass_hash ? "Required if set on note" : "Optional"}
                    value={b.pass ?? ""}
                    onChange={(e) => onUpdate(b.id, { pass: e.target.value || undefined })}
                  />
                </div>
              </div>
              {note?.sync_pass_hash && !(b.pass ?? "").trim() ? (
                <p className="mt-2 text-[10px] text-amber-300">Sync pass required on this note — enter it above.</p>
              ) : null}
              <div className="mt-2 flex items-center gap-2 text-[10px]">
                <StatusBadge tone={syncTone}>{note?.syncLabel ?? "—"}</StatusBadge>
                <span className="text-[var(--muted)]">{note ? `${note.id.slice(0, 8)}…` : "Note missing"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {bindings.length === 0 ? (
        <p className="py-2 text-[11px] text-[var(--muted)]">No bindings — add one to auto-import cookies into a note.</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost btn text-[12px]"
          disabled={!notesForBind.length}
          onClick={() => {
            const n = notesForBind[0];
            if (n) onAdd(n.id, n.domain || ".example.com", "");
          }}
        >
          <Plus size={14} />
          Add binding
        </button>
        <button type="button" className="btn text-[12px]" onClick={onPushExtension}>
          Save & push to extension
        </button>
      </div>
    </Glass>
  );
}
