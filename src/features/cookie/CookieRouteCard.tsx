import { Cookie, FileText, Link2, RefreshCw, UserRound } from "lucide-react";
import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardHeader,
  HubDirectoryCardLeadingTile,
  HubDirectoryCardMetaRow,
  HubDirectoryInteractiveCard,
  HUB_DIRECTORY_CARD_ICON_GLYPH_PX,
} from "@tool-workspace/hub-ui";
import { formatTimestampCompact } from "../../lib/format-timestamp";
import type { CookieAutoRow } from "./cookieAutoRow";
import { CookieRouteChipRow } from "./CookieRouteChipRow";
import { prefetchNoteCookieMembers } from "./cookieRouteMembersPrefetch";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import { resolveRouteSyncedDisplayIso } from "./route-sync-display";
import { resolveCookieRouteOwnerLabel } from "./cookie-route-owner";
import { resolveRouteStatusDot } from "./route-status-dot";
import type { CookieVaultRow } from "./useCookieVaultMap";

export type CookieRouteCardProps = {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  shareCount?: number;
  checked: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
};

/** P0020 route directory card — golden HubDirectory shell (parity with HubToolCard). */
export function CookieRouteCard({
  row,
  vault,
  shareCount,
  checked,
  onOpen,
  onSelect,
  onCheck,
}: CookieRouteCardProps) {
  const { binding, note } = row;
  const status = note?.sync_status ?? "pending";
  const syncedIso = resolveRouteSyncedDisplayIso({ noteSyncedAt: note?.synced_at });
  const loadIso = vault?.updated_at?.trim() || null;
  const sourceLocked = Boolean(binding.sourceBrowserId);
  const statusDot = resolveRouteStatusDot({ sourceLocked, syncStatus: status });
  const icon = resolveCookieSiteIcon(binding.domain);
  const title = binding.noteTitle ?? note?.title ?? "Untitled route";
  const owner = resolveCookieRouteOwnerLabel(binding);

  return (
    <HubDirectoryInteractiveCard
      selected={checked}
      ariaLabel={`Open ${title}`}
      onActivate={onOpen}
      className="group"
    >
      <HubDirectoryCardCheckbox
        checked={checked}
        label={`Select ${title}`}
        onChange={() => {
          onCheck(!checked);
          onSelect();
        }}
      />
      <div
        className="flex flex-1 flex-col p-4 pr-10"
        onMouseEnter={() => prefetchNoteCookieMembers(binding.noteId)}
      >
        <HubDirectoryCardHeader
          leading={
            <HubDirectoryCardLeadingTile statusColor={statusDot.color} statusTitle={statusDot.title}>
              {icon ? (
                <img
                  src={icon.src}
                  alt={icon.label}
                  className="hub-directory-card-leading-glyph object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Cookie size={HUB_DIRECTORY_CARD_ICON_GLYPH_PX} className="hub-directory-card-leading-glyph text-indigo-200 opacity-75" />
              )}
            </HubDirectoryCardLeadingTile>
          }
          badges={
            <span className="rounded border border-white/10 bg-white/[.04] px-1.5 py-0.5 text-[9px] font-medium text-indigo-200">
              {icon?.label ?? "Cookie"}
            </span>
          }
          title={title}
        />

        <div className="min-h-[var(--hub-card-meta-min-h)] shrink-0 space-y-1.5 text-xs text-[var(--muted)]">
          <HubDirectoryCardMetaRow icon={Link2} tint="#38bdf8">
            <span className="truncate font-mono text-indigo-300/90">{binding.domain}</span>
          </HubDirectoryCardMetaRow>
          <HubDirectoryCardMetaRow icon={FileText} tint="#a78bfa">
            <span className="truncate">{binding.syncId || (binding.useNoteIdRpc ? "by UUID" : binding.noteId)}</span>
          </HubDirectoryCardMetaRow>
          <HubDirectoryCardMetaRow icon={UserRound} tint="#c4b5fd">
            <span className="truncate" title={owner}>
              {owner}
            </span>
          </HubDirectoryCardMetaRow>
          <HubDirectoryCardMetaRow icon={RefreshCw} tint="#818cf8">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span title={syncedIso ?? "No extension sync yet"}>
                <span className="text-[10px] text-[var(--muted)]">Sync</span>{" "}
                <span className="font-medium text-indigo-200/90">
                  {formatTimestampCompact(syncedIso) ?? "—"}
                </span>
              </span>
              <span className="text-white/20">·</span>
              <span title={loadIso ?? "No vault load yet"}>
                <span className="text-[10px] text-[var(--muted)]">Load</span>{" "}
                <span className="font-medium text-indigo-200/90">
                  {formatTimestampCompact(loadIso) ?? "—"}
                </span>
              </span>
            </span>
          </HubDirectoryCardMetaRow>
        </div>

        <div className="mt-auto shrink-0 pt-3">
          <CookieRouteChipRow
            binding={binding}
            syncStatus={status}
            noteSyncedAt={note?.synced_at}
            vaultCookieCount={vault?.cookie_count}
            shareCount={shareCount}
          />
        </div>
      </div>
    </HubDirectoryInteractiveCard>
  );
}
