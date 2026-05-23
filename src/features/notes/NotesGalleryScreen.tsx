import { useMemo, useState } from "react";
import { Pin, Plus, Search, SlidersHorizontal } from "lucide-react";
import { StatusBadge } from "../../theme/p0008";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { PageHeader } from "../design-preview/screens/PageHeader";
import { NotesAuthGate } from "./NotesAuthGate";
import { useNotes } from "./useNotes";
import { useNotesAuth } from "./useNotesAuth";

export function NotesGalleryScreen({ onOpenNote }: { onOpenNote?: (noteId: string) => void }) {
  const { session, loading: authLoading, isSupabaseConfigured } = useNotesAuth();
  const { notes, loading, error, createNote } = useNotes(session);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const selectedId = readNoteIdFromUrl();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.domain.toLowerCase().includes(q) ||
        n.slug.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const onNew = async () => {
    setCreating(true);
    try {
      const row = await createNote();
      onOpenNote?.(row.id);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="anim-fade p-6 text-sm text-amber-200">
        Supabase chưa cấu hình. Thêm <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>.
      </div>
    );
  }

  if (authLoading) {
    return <div className="anim-fade p-6 text-sm text-[var(--muted)]">Đang tải phiên…</div>;
  }

  if (!session) {
    return (
      <div className="anim-fade p-6">
        <NotesAuthGate />
      </div>
    );
  }

  return (
    <div className="anim-fade">
      <PageHeader
        title="Notes"
        desc="V5 Card Gallery — Supabase CRUD."
        actions={
          <button type="button" className="btn text-[12px]" onClick={() => void onNew()} disabled={creating}>
            <Plus size={14} />
            {creating ? "Đang tạo…" : "New note"}
          </button>
        }
      />

      {error ? (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error.includes("relation") || error.includes("notes")
            ? `${error} — chạy migration supabase/migrations/20260523120000_tool_manager_notes.sql`
            : error}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className="field !py-2 !pl-8 text-[12px]"
            placeholder="Tìm note, domain…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className="btn-ghost btn text-[12px]" title="Pin filter — Sprint 2">
          <SlidersHorizontal size={14} />
          Filter
        </button>
      </div>

      {loading ? <p className="text-[12px] text-[var(--muted)]">Đang tải notes…</p> : null}

      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((n) => {
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
              {n.domain ? <p className="font-mono text-[10px] text-indigo-300/80">{n.domain}</p> : null}
              <p className="mt-1 text-[10px] text-[var(--muted)]">Cập nhật {n.updatedLabel}</p>
              <footer className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                <StatusBadge tone={n.syncTone}>{n.syncLabel}</StatusBadge>
                <span className="text-[10px] text-indigo-300">Mở →</span>
              </footer>
            </button>
          );
        })}
      </div>

      {!loading && filtered.length === 0 ? (
        <p className="mt-4 text-[12px] text-[var(--muted)]">Chưa có note. Bấm New note để bắt đầu.</p>
      ) : null}
    </div>
  );
}
