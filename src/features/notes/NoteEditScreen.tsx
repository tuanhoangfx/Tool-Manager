import { useEffect, useState } from "react";
import { Cookie, Eye, Link2, Save, Trash2, X } from "lucide-react";
import { WorkspaceLoadingView } from "../../components/sales-shell";
import { Glass, StatusBadge } from "../../theme/p0008";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { PageHeader } from "../design-preview/screens/PageHeader";
import { NotesAuthGate } from "./NotesAuthGate";
import { cookieLines, slugifyTitle } from "./noteUtils";
import { buildShareUrl } from "./shareUtils";
import { useNote } from "./useNote";
import { useNotes } from "./useNotes";
import { useNotesAuth } from "./useNotesAuth";

export function NoteEditScreen({
  onClose,
  shellMode,
}: {
  onClose?: () => void;
  shellMode?: boolean;
}) {
  const noteId = readNoteIdFromUrl();
  const { session, loading: authLoading, isSupabaseConfigured, offline } = useNotesAuth();
  const { note, loading, error, saving, save } = useNote(session, noteId);
  const { notes, deleteNote } = useNotes(session);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setSlug(note.slug);
    setDomain(note.domain);
    setBody(note.body_md);
    setPinned(note.pinned);
    setShareEnabled(note.share_enabled);
  }, [note]);

  const onSave = async () => {
    setActionError("");
    try {
      await save({
        title,
        slug,
        domain,
        body_md: body,
        pinned,
        share_enabled: shareEnabled,
        share_password: sharePassword || undefined,
      });
      setSharePassword("");
      setSavedHint("Saved");
      setTimeout(() => setSavedHint(""), 2500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onDelete = async () => {
    if (!noteId || !confirm("Delete this note?")) return;
    setActionError("");
    try {
      await deleteNote(noteId);
      onClose?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!isSupabaseConfigured && !offline) {
    return <div className="anim-fade p-6 text-sm text-amber-200">Supabase is not configured.</div>;
  }

  if (authLoading) {
    return <WorkspaceLoadingView screen="notes" variant="full" />;
  }

  if (!session) {
    return <NotesAuthGate variant="notes" />;
  }

  if (!noteId) {
    return (
      <div className="anim-fade p-6 text-sm text-[var(--muted)]">
        Pick a note from the gallery.
        <button type="button" className="btn-ghost btn ml-2 text-[12px]" onClick={onClose}>
          Back to Notes
        </button>
      </div>
    );
  }

  if (loading) {
    return <WorkspaceLoadingView screen="notes" variant="full" />;
  }

  if (error || !note) {
    return (
      <div className="anim-fade p-6 text-sm text-rose-200">
        {error || "Note not found"}
        <button type="button" className="btn-ghost btn ml-2 text-[12px]" onClick={onClose}>
          Back to Notes
        </button>
      </div>
    );
  }

  const lines = cookieLines(note.cookie_snapshot);
  const shareUrl = note.share_token && note.share_enabled ? buildShareUrl(note.share_token) : "";

  return (
    <div className="anim-fade">
      {!shellMode ? (
        <PageHeader
          title="Edit note"
          desc={`V5 drawer · ${note.id.slice(0, 8)}…`}
          actions={
            <>
              <button type="button" className="btn-ghost btn text-[12px]" onClick={onClose}>
                <X size={14} />
                Close
              </button>
              <button type="button" className="btn-ghost btn text-[12px] text-rose-300" onClick={() => void onDelete()}>
                <Trash2 size={14} />
              </button>
              <button type="button" className="btn text-[12px]" onClick={() => void onSave()} disabled={saving}>
                <Save size={14} />
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        />
      ) : (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost btn text-[12px] text-rose-300" onClick={() => void onDelete()}>
            <Trash2 size={14} />
            Delete
          </button>
          <button type="button" className="btn text-[12px]" onClick={() => void onSave()} disabled={saving}>
            <Save size={14} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {savedHint ? (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
          {savedHint}
        </p>
      ) : null}
      {actionError ? (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {actionError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <button
          type="button"
          onClick={onClose}
          className="hidden w-full rounded-xl border border-white/5 bg-black/20 p-4 text-left opacity-40 transition-opacity hover:opacity-60 lg:block"
        >
          <p className="text-[11px] text-[var(--muted)]">← Back to Gallery</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {notes.slice(0, 6).map((n) => (
              <div
                key={n.id}
                className={`h-20 rounded-lg border ${n.id === noteId ? "border-indigo-400/40" : "border-white/10"} bg-white/[.02]`}
                title={n.title}
              />
            ))}
          </div>
        </button>

        <div className="anim-right space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <Glass tone="indigo" className="!p-3">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Title</label>
            <input className="field text-[13px] font-medium" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="mb-1 mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Slug</label>
            <input
              className="field font-mono text-[11px]"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug(slugifyTitle(title, slug))}
            />
            <label className="mb-1 mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Cookie domain</label>
            <input className="field font-mono text-[11px]" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <label className="mt-3 flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin note
            </label>
          </Glass>

          <Glass tone="indigo" label="Markdown content" className="flex flex-col">
            <div className="mb-2 flex justify-end">
              <button type="button" className="btn-ghost btn text-[11px]">
                <Eye size={12} />
                Preview
              </button>
            </div>
            <textarea
              className="field min-h-[11rem] resize-y font-mono text-[11px] leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Glass>

          <Glass tone="amber" label="Cookie snapshot" icon={<Cookie size={12} />}>
            <div className="mb-2 flex items-center justify-between">
              <StatusBadge tone="emerald">Hourly · masked</StatusBadge>
              <span className="text-[10px] text-[var(--muted)]">read-only</span>
            </div>
            <ul className="space-y-0.5 font-mono text-[10px] text-indigo-200/80">
              {lines.length ? lines.map((line) => <li key={line}>{line}</li>) : <li className="text-[var(--muted)]">No snapshot yet</li>}
            </ul>
          </Glass>

          <Glass tone="cyan" label="Share link" icon={<Link2 size={12} />}>
            <label className="mb-2 flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={shareEnabled}
                disabled={offline}
                onChange={(e) => setShareEnabled(e.target.checked)}
              />
              Enable public share
            </label>
            {offline ? (
              <p className="mb-2 text-[10px] text-amber-200/80">
                Offline mode: sharing requires Supabase and is disabled.
              </p>
            ) : null}
            {shareEnabled ? (
              <>
                <div className="flex gap-2">
                  <input className="field flex-1 font-mono text-[10px]" readOnly value={shareUrl || "Save to generate link"} />
                  <button
                    type="button"
                    className="btn-ghost btn shrink-0 text-[11px]"
                    disabled={!shareUrl}
                    onClick={() => {
                      if (!shareUrl) return;
                      void navigator.clipboard.writeText(shareUrl);
                      setSavedHint("Share link copied");
                    }}
                  >
                    Copy
                  </button>
                </div>
                <label className="mb-1 mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Share password {note.share_password_hash ? "(set — enter a new one to change)" : ""}
                </label>
                <input
                  className="field text-[12px]"
                  type="password"
                  placeholder="Optional — protect content"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />
                <p className="mt-2 text-[10px] text-[var(--muted)]">
                  Public: <code className="text-indigo-300">?screen=share&amp;token=…</code>
                </p>
              </>
            ) : (
              <p className="text-[10px] text-[var(--muted)]">Disabling share will revoke the link on the next Save.</p>
            )}
          </Glass>
        </div>
      </div>
    </div>
  );
}
