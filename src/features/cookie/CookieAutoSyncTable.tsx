import { useState } from "react";
import { Cookie, Pencil, Plus, RefreshCw, Shield, Trash2, Zap } from "lucide-react";
import type { NoteListItem } from "../notes/types";
import { cookieLines } from "../notes/noteUtils";
import { DOMAIN_PRESETS, type CookieBinding } from "./cookieBridge";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { vaultKey } from "./useCookieVaultMap";
import { Glass, StatusBadge } from "../../theme/p0008";

function formatRouteSyncTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatVaultTime(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export type CookieAutoRow = {
  binding: CookieBinding;
  note: NoteListItem | undefined;
  lines: string[];
};

function buildRows(bindings: CookieBinding[], notes: NoteListItem[]): CookieAutoRow[] {
  return bindings
    .filter((b) => b.enabled)
    .map((binding) => {
      const note = notes.find((n) => n.id === binding.noteId);
      const lines = note ? cookieLines(note.cookie_snapshot) : [];
      return { binding, note, lines };
    });
}

type Props = {
  bindings: CookieBinding[];
  notes: NoteListItem[];
  loading?: boolean;
  selectedBindingId?: string | null;
  onSelect?: (bindingId: string) => void;
  onAdd?: (noteId: string, domain: string, pass: string) => void;
  onUpdate?: (id: string, patch: Partial<CookieBinding>) => void;
  onRemove?: (id: string) => void;
  onSyncRoute?: (binding: CookieBinding) => void;
  onPushExtension?: () => void;
  onRefresh?: () => void;
  vaultByKey?: Record<string, CookieVaultRow>;
  vaultError?: string | null;
};

export function CookieAutoSyncTable({
  bindings,
  notes,
  loading,
  selectedBindingId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onSyncRoute,
  onPushExtension,
  onRefresh,
  vaultByKey = {},
  vaultError,
}: Props) {
  const rows = buildRows(bindings, notes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draftNoteId, setDraftNoteId] = useState("");
  const [draftDomain, setDraftDomain] = useState(".facebook.com");
  const [draftPass, setDraftPass] = useState("");

  const editing = editingId ? bindings.find((b) => b.id === editingId) : null;

  const submitAdd = () => {
    if (!onAdd || !draftNoteId.trim()) return;
    onAdd(draftNoteId.trim(), draftDomain.trim(), draftPass.trim());
    onPushExtension?.();
    setAddOpen(false);
    setDraftPass("");
  };

  return (
    <Glass tone="emerald" label="Cookie Auto — active sync" icon={<Cookie size={12} />}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--muted)]">
          Select a route for extension Sync / Load cookies. Snapshot + vault per binding.
        </p>
        <div className="flex flex-wrap gap-2">
          {onAdd ? (
            <button
              type="button"
              className="btn-ghost btn text-[11px]"
              onClick={() => {
                setAddOpen((v) => !v);
                if (!draftNoteId && notes[0]) setDraftNoteId(notes[0].id);
              }}
            >
              <Plus size={12} />
              Add route
            </button>
          ) : null}
          {onRefresh ? (
            <button type="button" className="btn-ghost btn shrink-0 text-[11px]" onClick={onRefresh}>
              <RefreshCw size={12} />
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {vaultError ? <p className="mb-2 text-[10px] text-amber-300/90">{vaultError}</p> : null}

      {addOpen && onAdd ? (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-black/25 p-3">
          <p className="mb-2 text-[10px] uppercase text-[var(--muted)]">New route</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-[9px] text-[var(--muted)]">Target note</label>
              <select
                className="field mt-0.5 w-full text-[11px]"
                value={draftNoteId}
                onChange={(e) => setDraftNoteId(e.target.value)}
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[var(--muted)]">Auto domain</label>
              <input
                className="field mt-0.5 font-mono text-[11px]"
                value={draftDomain}
                onChange={(e) => setDraftDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] text-[var(--muted)]">Sync pass (optional)</label>
              <input
                type="password"
                className="field mt-0.5 text-[11px]"
                value={draftPass}
                onChange={(e) => setDraftPass(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {DOMAIN_PRESETS.map((p) => (
              <button
                key={p.domain}
                type="button"
                className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[var(--muted)] hover:border-emerald-400/40"
                onClick={() => setDraftDomain(p.domain)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn text-[11px]" onClick={submitAdd}>
              Add & push
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[820px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <th className="w-8 px-2 py-2.5" />
              <th className="px-3 py-2.5 font-medium">Auto domain</th>
              <th className="px-3 py-2.5 font-medium">Target note</th>
              <th className="px-3 py-2.5 font-medium">Sync ID</th>
              <th className="px-3 py-2.5 font-medium">Cookie snapshot</th>
              <th className="px-3 py-2.5 font-medium">
                <span className="inline-flex items-center gap-1" title="note_cookie_vault.updated_at on Supabase">
                  <Shield size={10} />
                  Vault cloud
                </span>
              </th>
              <th className="px-3 py-2.5 font-medium" title="note_cookie_vault.updated_by — ai Sync/Load vault sau cùng">
                Last user
              </th>
              <th className="px-3 py-2.5 font-medium" title="notes.synced_at — snapshot mask, not vault">
                Note synced
              </th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ binding, note, lines }) => {
              const tone = note?.syncTone ?? "amber";
              const status = note?.sync_status ?? "pending";
              const vault = binding.noteId?.trim()
                ? vaultByKey[vaultKey(binding.noteId.trim(), binding.domain)]
                : undefined;
              const selected = selectedBindingId === binding.id;
              return (
                <tr
                  key={binding.id}
                  className={`border-b border-white/5 ${selected ? "bg-indigo-500/10" : "hover:bg-white/[.02]"}`}
                >
                  <td className="px-2 py-2.5 text-center">
                    <input
                      type="radio"
                      name="cookie-route"
                      checked={selected}
                      title="Use this route in extension"
                      onChange={() => onSelect?.(binding.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-indigo-300/90">{binding.domain}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[var(--text)]">
                      {binding.noteTitle ?? note?.title ?? "—"}
                    </div>
                    <code className="text-[9px] text-[var(--muted)]">
                      {binding.noteId ? `${binding.noteId.slice(0, 8)}…` : "—"}
                    </code>
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
                      {binding.syncId || (binding.useNoteIdRpc ? "by UUID" : "—")}
                    </code>
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5">
                    {lines.length ? (
                      <ul className="space-y-0.5 font-mono text-[10px] text-[var(--muted)]">
                        {lines.slice(0, 3).map((l) => (
                          <li key={l} className="truncate" title={l}>
                            {l}
                          </li>
                        ))}
                        {lines.length > 3 ? (
                          <li className="text-indigo-300/70">+{lines.length - 3} more</li>
                        ) : null}
                      </ul>
                    ) : (
                      <span className="text-[var(--muted)]">Awaiting sync…</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px]">
                    {vault ? (
                      <div>
                        <span className="font-mono text-violet-200/90">{vault.cookie_count} cookies</span>
                        <div className="text-[10px] text-[var(--muted)]">{formatVaultTime(vault.updated_at)}</div>
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">No vault yet — Sync now (logged-in browser)</span>
                    )}
                  </td>
                  <td className="max-w-[140px] px-3 py-2.5 text-[10px] text-amber-200/90" title={vault?.updated_by ?? ""}>
                    {vault?.updated_by || vault?.source_browser ? (
                      <span className="line-clamp-2 break-all">
                        {vault.updated_by ?? vault.source_browser}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-[var(--muted)]">
                    <div>{note?.syncLabel ?? "—"}</div>
                    {note?.synced_at ? (
                      <div className="text-[9px] text-indigo-300/70" title={note.synced_at}>
                        {formatRouteSyncTime(note.synced_at)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={tone}>{status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {onSyncRoute ? (
                        <button
                          type="button"
                          className="btn-ghost btn !px-1.5 !py-0.5 text-[10px]"
                          title="Sync this route in extension"
                          onClick={() => onSyncRoute(binding)}
                        >
                          <Zap size={11} />
                        </button>
                      ) : null}
                      {onUpdate ? (
                        <button
                          type="button"
                          className="btn-ghost btn !px-1.5 !py-0.5 text-[10px]"
                          onClick={() => setEditingId(binding.id)}
                        >
                          <Pencil size={11} />
                        </button>
                      ) : null}
                      {onRemove ? (
                        <button
                          type="button"
                          className="btn-ghost btn !px-1.5 !py-0.5 text-[10px] text-rose-300"
                          onClick={() => {
                            if (confirm("Remove this route?")) onRemove(binding.id);
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && onUpdate ? (
        <div className="mt-3 rounded-lg border border-indigo-500/30 bg-black/25 p-3">
          <p className="mb-2 text-[10px] uppercase text-[var(--muted)]">Edit route</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-[9px] text-[var(--muted)]">Note</label>
              <select
                className="field mt-0.5 w-full text-[11px]"
                value={editing.noteId}
                onChange={(e) => {
                  const n = notes.find((x) => x.id === e.target.value);
                  onUpdate(editing.id, {
                    noteId: e.target.value,
                    syncId: n?.sync_id ?? "",
                    noteTitle: n?.title,
                    requiresPass: Boolean(n?.sync_pass_hash),
                  });
                }}
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[var(--muted)]">Domain</label>
              <input
                className="field mt-0.5 font-mono text-[11px]"
                value={editing.domain}
                onChange={(e) => onUpdate(editing.id, { domain: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[9px] text-[var(--muted)]">Sync pass</label>
              <input
                type="password"
                className="field mt-0.5 text-[11px]"
                placeholder={editing.requiresPass ? "Required" : "Optional"}
                value={editing.pass ?? ""}
                onChange={(e) => onUpdate(editing.id, { pass: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn text-[11px]"
              onClick={() => {
                onPushExtension?.();
                setEditingId(null);
              }}
            >
              Save & push
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setEditingId(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="py-3 text-center text-[11px] text-[var(--muted)]">Loading notes…</p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--muted)]">
          No active routes — click Add route or use Quick connect below.
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          {rows.length} route(s) · selected route syncs in extension ·{" "}
          {rows.reduce((n, r) => n + r.lines.length, 0)} cookie line(s) in notes
        </p>
      ) : null}
    </Glass>
  );
}
