import { useEffect, useRef, useState } from "react";
import { Eye, Link2, PenLine, Save, StickyNote } from "lucide-react";
import { MetaChip } from "@tool-workspace/hub-ui";
import { useAppToast } from "../../components/toast";
import { cookieLines } from "./noteUtils";
import type { NoteRow } from "./types";
import { readShareTokenFromUrl } from "./shareUtils";
import { savePublicShareNote } from "./publicShareRepository";
import { usePublicShare } from "./usePublicShare";

function syncTextareaHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const body = el.closest(".notes-editor__body");
  const fillMin = Math.max((body?.clientHeight ?? 0) - 24, 280);
  el.style.height = "auto";
  el.style.minHeight = `${fillMin}px`;
  el.style.height = `${Math.max(el.scrollHeight, fillMin)}px`;
}

/** Public share — no login; editor shell matching Notes workspace. */
export function PublicShareScreen() {
  const token = readShareTokenFromUrl();
  const { pushToast } = useAppToast();
  const { row, loading, error, unlocked, verifyPassword, refresh } = usePublicShare(token);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [checking, setChecking] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!row || !unlocked) return;
    setTitle(row.title);
    setBody(row.body_md);
  }, [row, unlocked]);

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [body, unlocked]);

  const onUnlock = async () => {
    setPwError("");
    setChecking(true);
    const ok = await verifyPassword(password);
    setChecking(false);
    if (!ok) setPwError("Incorrect password.");
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-[var(--muted)]">
        Missing share token in URL.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-rose-300">
        {error || "Note not found."}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="theme-hub flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--panel)] p-6 text-center shadow-2xl shadow-black/40">
          <Link2 size={24} className="mx-auto mb-3 text-cyan-300" />
          <p className="text-[11px] text-[var(--muted)]">Shared note · no sign-in</p>
          <h1 className="mt-2 text-lg font-semibold text-[var(--text)]">{row.title}</h1>
          <input
            className="field mx-auto mt-4 max-w-xs text-center text-[12px]"
            type="password"
            name="p0020-public-share-unlock"
            autoComplete="new-password"
            placeholder="Enter share password…"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void onUnlock()}
          />
          {pwError ? <p className="mt-2 text-[12px] text-rose-300">{pwError}</p> : null}
          <button type="button" className="btn mx-auto mt-3 text-[12px]" onClick={() => void onUnlock()} disabled={checking}>
            {checking ? "Checking…" : "Open"}
          </button>
        </div>
      </div>
    );
  }

  const canEdit = row.share_can_edit;
  const lines = cookieLines(row.cookie_snapshot as NoteRow["cookie_snapshot"]);

  const onSave = async () => {
    if (!token || !canEdit) return;
    setSaving(true);
    const res = await savePublicShareNote(token, { title, body_md: body }, password || undefined);
    setSaving(false);
    if (!res.ok) {
      pushToast(res.error, "error");
      return;
    }
    pushToast("Saved", "success");
    await refresh(password || undefined);
  };

  return (
    <div className="theme-hub flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-2.5">
        <StickyNote size={16} className="text-indigo-400" aria-hidden />
        <span className="text-sm font-semibold">Shared note</span>
        <MetaChip
          icon={canEdit ? <PenLine size={11} /> : <Eye size={11} />}
          label={canEdit ? "Edit link" : "View only"}
          tone={canEdit ? "violet" : "cyan"}
        />
        {canEdit ? (
          <button
            type="button"
            className="btn ml-auto h-7 gap-1 px-2.5 text-[10px]"
            disabled={saving}
            onClick={() => void onSave()}
          >
            <Save size={12} />
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </header>

      <div className="notes-workspace flex min-h-0 flex-1 flex-col p-3">
        <section className="notes-editor flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
          <div className="notes-editor__header flex min-h-[2.375rem] shrink-0 items-center gap-2 border-b border-white/5 px-3 py-1.5">
            {canEdit ? (
              <input
                className="notes-editor__title min-w-[4ch] flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--text)] outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Note title"
              />
            ) : (
              <h1 className="notes-editor__title min-w-0 flex-1 truncate text-sm font-semibold">{row.title}</h1>
            )}
          </div>

          <div className="notes-editor__body min-h-0 flex-1 cursor-text overflow-y-auto px-3 py-2">
            {lines.length ? (
              <ul className="mb-3 space-y-0.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 font-mono text-[10px] text-indigo-200/80">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {canEdit ? (
              <textarea
                ref={textareaRef}
                className="notes-editor__textarea w-full resize-none font-sans text-[13px] leading-relaxed outline-none"
                placeholder="Write markdown…"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  syncTextareaHeight(e.target);
                }}
              />
            ) : (
              <pre className="notes-editor__textarea w-full whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[var(--text)]">
                {row.body_md || "—"}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
