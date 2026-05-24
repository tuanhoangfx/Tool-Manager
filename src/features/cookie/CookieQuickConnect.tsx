import { useEffect, useState } from "react";
import { Link2, Loader2, Plus } from "lucide-react";
import { useAppToast } from "../../components/toast";
import type { NoteListItem } from "../notes/types";
import { Glass } from "../../theme/p0008";
import { readCookieDeepLink } from "./cookieDeepLink";
import { normalizeCookieDomain } from "./normalizeCookieDomain";
import { resolveNoteForBinding } from "./resolveNoteForBinding";
import { isMissingSyncIdColumn, migrationHintMessage } from "../notes/notesSelect";

type ConnectResult = { ok: true } | { ok: false; error: string };

type Props = {
  notes: NoteListItem[];
  onConnect: (opts: {
    noteId?: string;
    syncId?: string;
    domain: string;
    pass: string;
  }) => Promise<ConnectResult>;
};

export function CookieQuickConnect({ notes, onConnect }: Props) {
  const { pushToast } = useAppToast();
  const [noteId, setNoteId] = useState("");
  const [syncId, setSyncId] = useState("");
  const [domain, setDomain] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolvedSync, setResolvedSync] = useState("");

  useEffect(() => {
    const link = readCookieDeepLink();
    if (link.noteId) setNoteId(link.noteId);
    if (link.syncId) setSyncId(link.syncId);
    if (link.domain) setDomain(link.domain);
    if (link.pass) setPass(link.pass);
  }, []);

  useEffect(() => {
    const id = noteId.trim();
    if (!id) {
      setResolvedSync("");
      return;
    }
    const local = notes.find((n) => n.id === id);
    if (local?.sync_id) {
      setResolvedSync(local.sync_id);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void resolveNoteForBinding({ noteId: id }).then(({ note, error }) => {
        if (cancelled) return;
        if (note) {
          setResolvedSync(note.sync_id ?? (note.useNoteIdRpc ? "(UUID mode — see docs/SUPABASE-P0020.md)" : ""));
        } else if (error && isMissingSyncIdColumn(error)) {
          setResolvedSync("");
          pushToast(migrationHintMessage(), "warn", 8000);
        } else {
          setResolvedSync("");
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [noteId, notes, pushToast]);

  const onSubmit = async () => {
    const domainNorm = normalizeCookieDomain(domain);
    if (!domainNorm) {
      pushToast("Domain không hợp lệ — dùng .facebook.com hoặc URL đầy đủ.", "warn");
      return;
    }
    if (!noteId.trim() && !syncId.trim()) {
      pushToast("Nhập Note ID (UUID) hoặc Sync ID.", "warn");
      return;
    }

    setBusy(true);
    const result = await onConnect({
      noteId: noteId.trim() || undefined,
      syncId: syncId.trim() || resolvedSync || undefined,
      domain,
      pass: pass.trim(),
    });
    setBusy(false);

    if (result.ok) {
      pushToast(
        `Đã kết nối ${domainNorm} · Sync ID ${syncId.trim() || resolvedSync}. Đã push extension.`,
        "success",
      );
      setPass("");
    } else {
      pushToast(result.error, "error", 8000);
    }
  };

  return (
    <Glass tone="cyan" label="Quick connect (Note ID or Sync ID)">
      <p className="mb-3 text-[11px] text-[var(--muted)]">
        Paste <strong>Note ID</strong> from Notes — we load <strong>Sync ID</strong> from Supabase. Domain:{" "}
        <code className="text-indigo-300">.facebook.com</code> (not full URL required; we normalize).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[9px] uppercase text-[var(--muted)]">Note ID (UUID)</label>
          <input
            className="field mt-0.5 font-mono text-[11px]"
            placeholder="5b675aab-4a04-442a-a86f-…"
            value={noteId}
            onChange={(e) => setNoteId(e.target.value)}
          />
          {resolvedSync ? (
            <p className="mt-1 text-[10px] text-cyan-300/90">
              Resolved Sync ID: <code>{resolvedSync}</code>
            </p>
          ) : noteId.trim() ? (
            <p className="mt-1 text-[10px] text-amber-300/80">Looking up note…</p>
          ) : null}
        </div>
        <div>
          <label className="text-[9px] uppercase text-[var(--muted)]">Or Sync ID (optional)</label>
          <input
            className="field mt-0.5 font-mono text-[11px]"
            placeholder="TM-xxxxxxxx"
            value={syncId}
            onChange={(e) => setSyncId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[9px] uppercase text-[var(--muted)]">Cookie domain</label>
          <input
            className="field mt-0.5 font-mono text-[11px]"
            placeholder=".facebook.com or https://www.facebook.com/"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          {domain.trim() && normalizeCookieDomain(domain) ? (
            <p className="mt-1 text-[10px] text-emerald-300/80">→ {normalizeCookieDomain(domain)}</p>
          ) : null}
        </div>
        <div>
          <label className="text-[9px] uppercase text-[var(--muted)]">Sync pass (if set on note)</label>
          <input
            className="field mt-0.5 text-[11px]"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn text-[12px]" disabled={busy} onClick={() => void onSubmit()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {busy ? "Connecting…" : "Add & push to extension"}
        </button>
        <span className="text-[10px] text-[var(--muted)]">
          {notes.length} note(s) in account
        </span>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--muted)]">
        <Link2 size={10} />
        Open note: <code className="text-indigo-300">?screen=notes&note=UUID</code>
      </p>
    </Glass>
  );
}
