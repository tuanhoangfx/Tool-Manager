import { Clock3, Globe2, Pin } from "lucide-react";
import { StatusBadge } from "../../theme/p0008";
import type { NoteListItem } from "./types";
import type { NotesListDensity } from "./notes-list-prefs";

type Props = {
  notes: NoteListItem[];
  selectedId: string | null;
  density: NotesListDensity;
  loading?: boolean;
  onSelect: (id: string) => void;
};

export function NotesListRail({
  notes,
  selectedId,
  density,
  loading,
  onSelect,
}: Props) {
  const compact = density === "compact";

  return (
    <aside className="notes-rail flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--panel)]/40">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        {loading ? <p className="px-2 py-3 text-[11px] text-[var(--muted)]">Loading…</p> : null}
        {!loading && notes.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-[var(--muted)]">No notes match filters.</p>
        ) : null}
        <ul className="space-y-1">
          {notes.map((n) => {
            const active = n.id === selectedId;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelect(n.id)}
                  className={`w-full rounded-lg border text-left transition-all ${
                    compact ? "px-2 py-1.5" : "px-2.5 py-2.5"
                  } ${
                    active
                      ? "border-indigo-400/45 bg-indigo-500/15 ring-1 ring-indigo-400/25"
                      : "border-transparent bg-white/[.02] hover:border-white/10 hover:bg-white/[.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className={`line-clamp-2 font-medium leading-snug text-[var(--text)] ${
                        compact ? "text-[11px]" : "text-[12px]"
                      }`}
                    >
                      {displayNoteTitle(n.title)}
                    </span>
                    {n.pinned ? <Pin size={12} className="shrink-0 text-violet-300" /> : null}
                  </div>
                  {!compact && n.domain ? (
                    <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[9px] text-cyan-200/75">
                      <Globe2 size={10} className="shrink-0" />
                      <span className="truncate">{n.domain}</span>
                    </p>
                  ) : null}
                  <div className={`mt-1 flex items-center justify-between gap-1 ${compact ? "mt-0.5" : ""}`}>
                    <StatusBadge tone={n.syncTone}>{compact ? n.sync_status : n.syncLabel}</StatusBadge>
                    <span className="inline-flex items-center gap-1 text-[9px] text-[var(--muted)]">
                      {compact ? null : <Clock3 size={10} />}
                      {compact ? "" : n.updatedLabel}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function displayNoteTitle(title: string): string {
  return title.trim() === "Note mới" ? "New note" : title || "Untitled";
}
