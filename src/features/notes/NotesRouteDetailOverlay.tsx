import type { Session } from "@supabase/supabase-js";
import { useMemo } from "react";
import {
  CookieRouteDetailModal,
  type CookieAutoRow,
} from "../cookie/CookieAutoSyncTable";
import {
  getActiveCookieBindingsForNote,
  normalizeCookieDomain,
  type CookieBinding,
} from "../cookie/cookieBridge";
import type { NoteRouteLockInfo } from "../cookie/noteRouteLockInfo";
import { useCookieRouteDetailRenderers } from "../cookie/useCookieRouteDetailRenderers";
import { useCookieVaultMap, vaultKey } from "../cookie/useCookieVaultMap";
import { cookieLines, toListItem } from "./noteUtils";
import type { NoteRow } from "./types";

type Props = {
  session: Session | null;
  note: NoteRow;
  routeDomain: string;
  routeInfos: NoteRouteLockInfo[];
  onClose: () => void;
};

function resolveBindingForRoute(
  note: NoteRow,
  routeDomain: string,
  routeInfos: NoteRouteLockInfo[],
): CookieBinding | null {
  const domain = normalizeCookieDomain(routeDomain);
  if (!domain) return null;
  const local = getActiveCookieBindingsForNote(note.id).find(
    (b) => normalizeCookieDomain(b.domain) === domain,
  );
  if (local) return local;

  const info = routeInfos.find((r) => normalizeCookieDomain(r.domain) === domain);
  if (!info) return null;

  return {
    id: `notes-route-${note.id}-${domain}`,
    noteId: note.id,
    syncId: info.syncId ?? note.sync_id ?? "",
    domain,
    enabled: true,
    noteTitle: info.noteTitle ?? note.title,
    useNoteIdRpc: !(info.syncId ?? note.sync_id)?.trim(),
    requiresPass: Boolean(note.sync_pass_hash),
  };
}

export function NotesRouteDetailOverlay({ session, note, routeDomain, routeInfos, onClose }: Props) {
  const binding = useMemo(
    () => resolveBindingForRoute(note, routeDomain, routeInfos),
    [note, routeDomain, routeInfos],
  );

  const bindings = useMemo(() => (binding ? [binding] : []), [binding]);
  const { vaultByKey } = useCookieVaultMap(session, bindings);
  const { renderAccessDetail, renderAgentDetail } = useCookieRouteDetailRenderers(session);

  const row = useMemo((): CookieAutoRow | null => {
    if (!binding) return null;
    const listNote = toListItem(note);
    return {
      binding,
      note: listNote,
      lines: cookieLines(note.cookie_snapshot),
    };
  }, [binding, note]);

  if (!row) return null;

  const vault = vaultByKey[vaultKey(row.binding.noteId, row.binding.domain)];

  return (
    <CookieRouteDetailModal
      row={row}
      vault={vault}
      renderAccessDetail={renderAccessDetail}
      renderAgentDetail={renderAgentDetail}
      onClose={onClose}
    />
  );
}
