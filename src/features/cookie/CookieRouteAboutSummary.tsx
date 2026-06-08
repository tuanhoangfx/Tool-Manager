import { useCallback, useEffect, useMemo, useState } from "react";
import { HubRouteAboutSummary } from "@tool-workspace/hub-ui";
import { getOfflineMode } from "../../lib/offlineMode";
import { useNotesAuth } from "../notes/useNotesAuth";
import type { CookieBinding } from "./cookieBridge";
import { getCookieRoutePublishStatus } from "./cookieRoutesRepository";
import {
  RoutePublishChip,
  RouteShareChip,
  RouteSyncChip,
  RouteVaultChip,
} from "./cookieRouteStatChips";
import { getCachedNoteCookieMembers, prefetchNoteCookieMembers } from "./cookieRouteMembersPrefetch";
import type { CookieVaultRow } from "./useCookieVaultMap";

type Props = {
  binding: CookieBinding;
  vault?: CookieVaultRow;
  noteSyncedAt?: string | null;
  syncStatus?: string | null;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
};

/** P0020 adapter — card-view stat chips + Route TM / Note ID in About. */
export function CookieRouteAboutSummary({
  binding,
  vault,
  noteSyncedAt,
  syncStatus,
  copiedField,
  onCopy,
}: Props) {
  const { session } = useNotesAuth();
  const [publishReady, setPublishReady] = useState(false);
  const [routePublished, setRoutePublished] = useState(false);

  const shareCount = useMemo(() => {
    const hit = getCachedNoteCookieMembers(binding.noteId);
    return hit?.ok ? hit.members.length : undefined;
  }, [binding.noteId]);

  const syncIdDisplay = useMemo(() => {
    const syncId = binding.syncId?.trim();
    if (syncId) return syncId;
    if (binding.useNoteIdRpc) return binding.noteId?.trim() || null;
    return null;
  }, [binding.noteId, binding.syncId, binding.useNoteIdRpc]);

  const loadPublishStatus = useCallback(async () => {
    if (binding.accessRole === "member" || getOfflineMode()) {
      setRoutePublished(false);
      setPublishReady(true);
      return;
    }
    const res = await getCookieRoutePublishStatus(session, binding);
    if (!res.ok) {
      setPublishReady(false);
      return;
    }
    setRoutePublished(res.published);
    setPublishReady(true);
  }, [binding, session]);

  useEffect(() => {
    setPublishReady(false);
    void prefetchNoteCookieMembers(binding.noteId);
    void loadPublishStatus();
  }, [binding.noteId, loadPublishStatus]);

  const chips = (
    <>
      <RouteSyncChip
        status={syncStatus ?? "pending"}
        noteSyncedAt={noteSyncedAt}
        vaultCookieCount={vault?.cookie_count}
      />
      <RouteVaultChip cookieCount={vault?.cookie_count} />
      <RouteShareChip binding={binding} shareCount={shareCount} />
      {binding.accessRole !== "member" ? (
        <RoutePublishChip published={routePublished} ready={publishReady} />
      ) : null}
    </>
  );

  return (
    <HubRouteAboutSummary
      chips={chips}
      noteId={binding.noteId}
      syncId={syncIdDisplay}
      copiedField={copiedField}
      onCopy={onCopy}
    />
  );
}
