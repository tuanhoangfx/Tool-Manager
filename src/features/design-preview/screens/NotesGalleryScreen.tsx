import { Link2, Pin, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Glass, StatusBadge } from "../../../theme/p0008";
import { readNoteIdFromUrl } from "../design-nav";
import { MOCK_NOTES } from "../mock-data";
import { PageHeader } from "./PageHeader";

export function NotesGalleryScreen({ onOpenNote }: { onOpenNote?: (noteId: string) => void }) {
  const selectedId = readNoteIdFromUrl() ?? "n1";

  return (
    <div className="anim-fade">
      <PageHeader
        title="Notes"
        desc="V5 — Bấm thẻ note để mở màn Chỉnh sửa (drawer mock)."
        actions={
          <button type="button" className="btn text-[12px]" onClick={() => onOpenNote?.("n1")}>
            <Plus size={14} />
            New note
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input className="field !py-2 !pl-8 text-[12px]" placeholder="Tìm note, domain… (gõ thử)" />
        </div>
        <button type="button" className="btn-ghost btn text-[12px]" title="Sprint 1">
          <SlidersHorizontal size={14} />
          Filter
        </button>
      </div>

      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_NOTES.map((n) => {
          const active = n.id === selectedId;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpenNote?.(n.id)}
              className={`anim-pop block w-full rounded-xl border p-4 text-left transition-all ${
                active
                  ? "border-indigo-400/50 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent ring-1 ring-indigo-400/30"
                  : "border-white/10 bg-white/[.03] hover:border-white/20 hover:bg-white/[.05]"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug text-[var(--text)]">{n.title}</h3>
                {n.pinned ? <Pin size={14} className="shrink-0 text-indigo-300" /> : null}
              </div>
              <p className="font-mono text-[10px] text-indigo-300/80">{n.domain}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">Cập nhật {n.updatedAt}</p>
              <footer className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                <StatusBadge tone={n.syncTone}>{n.sync}</StatusBadge>
                <span className="text-[10px] text-indigo-300">Mở →</span>
              </footer>
            </button>
          );
        })}
      </div>
    </div>
  );
}
