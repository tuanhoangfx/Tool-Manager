import { useMemo } from "react";
import { HubRouteAboutSummary } from "@tool-workspace/hub-ui";
import type { CookieBinding } from "./cookieBridge";
import { CookieRouteChipRow } from "./CookieRouteChipRow";
import type { CookieVaultRow } from "./useCookieVaultMap";

type Props = {
  binding: CookieBinding;
  vault?: CookieVaultRow;
  noteSyncedAt?: string | null;
  syncStatus?: string | null;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
};

/** P0020 adapter — stat chips + Route TM / Note ID in About. */
export function CookieRouteAboutSummary({
  binding,
  vault,
  noteSyncedAt,
  syncStatus,
  copiedField,
  onCopy,
}: Props) {
  const syncIdDisplay = useMemo(() => {
    const syncId = binding.syncId?.trim();
    if (syncId) return syncId;
    if (binding.useNoteIdRpc) return binding.noteId?.trim() || null;
    return null;
  }, [binding.noteId, binding.syncId, binding.useNoteIdRpc]);

  return (
    <HubRouteAboutSummary
      chips={
        <CookieRouteChipRow
          binding={binding}
          syncStatus={syncStatus ?? "pending"}
          noteSyncedAt={noteSyncedAt}
          vaultCookieCount={vault?.cookie_count}
        />
      }
      noteId={binding.noteId}
      syncId={syncIdDisplay}
      copiedField={copiedField}
      onCopy={onCopy}
    />
  );
}
