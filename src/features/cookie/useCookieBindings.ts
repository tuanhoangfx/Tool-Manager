import { useCallback, useEffect, useMemo, useState } from "react";
import type { NoteListItem } from "../notes/types";
import { debounce } from "../../lib/debounce";
import {
  bindingsForExtension,
  loadCookieBindings,
  newBindingId,
  normalizeCookieDomain,
  saveCookieBindings,
  type CookieBinding,
  loadSelectedBindingId,
  saveSelectedBindingId,
} from "./cookieBridge";
import {
  broadcastCookieBindings,
  broadcastSelectedBinding,
} from "./cookieBridgeProtocol";
import { resolveNoteForBinding } from "./resolveNoteForBinding";

const PUSH_DEBOUNCE_MS = 300;

export function useCookieBindings(notes: NoteListItem[]) {
  const [bindings, setBindings] = useState<CookieBinding[]>(() => loadCookieBindings());
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    setPersistReady(true);
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    saveCookieBindings(bindings);
  }, [bindings, persistReady]);

  const notesKey = notes.map((n) => `${n.id}:${n.sync_id}:${n.title}`).join("|");

  const pushToExtension = useCallback((list = bindings) => {
    broadcastCookieBindings(bindingsForExtension(list));
    const selId = loadSelectedBindingId();
    const sel = selId ? list.find((b) => b.id === selId) : list.find((b) => b.enabled);
    broadcastSelectedBinding(sel?.noteId ?? null);
  }, [bindings]);

  const pushDebounced = useMemo(
    () => debounce((list: CookieBinding[]) => pushToExtension(list), PUSH_DEBOUNCE_MS),
    [pushToExtension],
  );

  useEffect(() => () => pushDebounced.cancel(), [pushDebounced]);

  useEffect(() => {
    if (!persistReady || bindings.length === 0) return;
    pushDebounced(bindings);
  }, [bindings, persistReady, pushDebounced]);

  const upsertBindingRow = useCallback(
    (row: Omit<CookieBinding, "id" | "enabled"> & { enabled?: boolean }) => {
      const full: CookieBinding = {
        id: newBindingId(),
        enabled: true,
        ...row,
      };
      setBindings((prev) => {
        const without = prev.filter((b) => {
          if (b.domain !== full.domain) return true;
          if (full.noteId && b.noteId === full.noteId) return false;
          if (full.syncId && b.syncId === full.syncId) return false;
          return true;
        });
        const next = [...without, full];
        saveCookieBindings(next);
        return next;
      });
      return full;
    },
    [],
  );

  const addBinding = useCallback(
    (noteId: string, domain: string, pass = "") => {
      const note = notes.find((n) => n.id === noteId);
      const domainNorm = normalizeCookieDomain(domain);
      if (!note || !domainNorm) return null;
      return upsertBindingRow({
        noteId,
        syncId: note.sync_id ?? "",
        domain: domainNorm,
        pass: pass || undefined,
        requiresPass: Boolean(note.sync_pass_hash),
        noteTitle: note.title,
        useNoteIdRpc: !note.sync_id?.trim(),
      });
    },
    [notes, upsertBindingRow],
  );

  const connectBinding = useCallback(
    (opts: { noteId?: string; syncId?: string; domain: string; pass?: string }): CookieBinding | null => {
      const domain = normalizeCookieDomain(opts.domain);
      if (!domain) return null;

      const local =
        (opts.noteId ? notes.find((n) => n.id === opts.noteId!.trim()) : undefined) ??
        (opts.syncId ? notes.find((n) => n.sync_id === opts.syncId!.trim()) : undefined);

      const noteId = local?.id ?? opts.noteId?.trim() ?? "";
      const syncId = (local?.sync_id ?? opts.syncId?.trim()) || "";
      if (!noteId && !syncId) return null;

      return upsertBindingRow({
        noteId,
        syncId,
        domain,
        pass: opts.pass?.trim() || undefined,
        requiresPass: Boolean(local?.sync_pass_hash),
        noteTitle: local?.title,
        useNoteIdRpc: !syncId,
      });
    },
    [notes, upsertBindingRow],
  );

  const connectBindingRemote = useCallback(
    async (
      opts: { noteId?: string; syncId?: string; domain: string; pass?: string },
    ): Promise<{ ok: true; row: CookieBinding } | { ok: false; error: string }> => {
      const domain = normalizeCookieDomain(opts.domain);
      if (!domain) {
        return {
          ok: false,
          error: "Invalid domain — use .facebook.com or https://www.facebook.com/",
        };
      }

      const local =
        (opts.noteId ? notes.find((n) => n.id === opts.noteId!.trim()) : undefined) ??
        (opts.syncId ? notes.find((n) => n.sync_id === opts.syncId!.trim()) : undefined);

      if (local?.sync_id) {
        const row = upsertBindingRow({
          noteId: local.id,
          syncId: local.sync_id ?? "",
          domain,
          pass: opts.pass?.trim() || undefined,
          requiresPass: Boolean(local.sync_pass_hash),
          noteTitle: local.title,
        });
        return { ok: true, row };
      }

      const { note, error } = await resolveNoteForBinding({
        noteId: opts.noteId,
        syncId: opts.syncId,
      });
      if (!note) {
        return { ok: false, error: error ?? "Note not found." };
      }

      const row = upsertBindingRow({
        noteId: note.id,
        syncId: note.sync_id ?? "",
        domain,
        pass: opts.pass?.trim() || undefined,
        requiresPass: Boolean(note.sync_pass_hash),
        noteTitle: note.title,
        useNoteIdRpc: note.useNoteIdRpc,
      });
      return { ok: true, row };
    },
    [notes, upsertBindingRow],
  );

  const updateBinding = useCallback((id: string, patch: Partial<CookieBinding>) => {
    setBindings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        if (patch.noteId) {
          const note = notes.find((n) => n.id === patch.noteId);
          if (note) {
            next.syncId = note.sync_id ?? next.syncId;
            next.noteTitle = note.title;
            next.useNoteIdRpc = !note.sync_id?.trim() && Boolean(next.noteId);
            next.requiresPass = Boolean(note.sync_pass_hash);
          }
        }
        return next;
      }),
    );
  }, [notes]);

  const removeBinding = useCallback((id: string) => {
    setBindings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const syncNoteMeta = useCallback(() => {
    setBindings((prev) =>
      prev.map((b) => {
        const note = notes.find((n) => n.id === b.noteId);
        if (!note) return b;
        return {
          ...b,
          syncId: note.sync_id ?? b.syncId,
          noteTitle: note.title,
          domain: b.domain || note.domain || b.domain,
          requiresPass: Boolean(note.sync_pass_hash),
          useNoteIdRpc: !note.sync_id?.trim() && Boolean(b.noteId),
        };
      }),
    );
  }, [notes]);

  useEffect(() => {
    if (!notes.length) return;
    syncNoteMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notesKey tracks list changes
  }, [notesKey, syncNoteMeta]);

  const connectAndPush = useCallback(
    async (opts: { noteId?: string; syncId?: string; domain: string; pass?: string }) => {
      const remote = await connectBindingRemote(opts);
      if (!remote.ok) {
        return { ok: false as const, error: remote.error };
      }
      pushDebounced.cancel();
      const list = loadCookieBindings();
      broadcastCookieBindings(bindingsForExtension(list));
      broadcastSelectedBinding(remote.row.noteId || null);
      saveSelectedBindingId(remote.row.id);
      return { ok: true as const, row: remote.row };
    },
    [connectBindingRemote, pushDebounced],
  );

  return {
    bindings,
    setBindings,
    addBinding,
    connectBinding,
    connectBindingRemote,
    connectAndPush,
    updateBinding,
    removeBinding,
    pushToExtension,
  };
}
