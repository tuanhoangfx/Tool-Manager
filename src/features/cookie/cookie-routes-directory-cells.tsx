import {
  DirectoryTableBodyCell,
  HubDirectoryToolBadge,
  HubActivityTimestampLabel,
  type HubDirectoryColumnDef,
} from "@tool-workspace/hub-ui";
import { LockKeyhole } from "lucide-react";
import { CookieRouteChipRow } from "./CookieRouteChipRow";
import type { CookieAutoRow } from "./cookieAutoRow";
import { resolveCookieRouteOwnerLabel } from "./cookie-route-owner";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import { resolveRouteSyncedDisplayIso } from "./route-sync-display";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { lookupVaultRow } from "./useCookieVaultMap";

export type CookieRouteTableSortKey = "updated" | "title" | "platform" | "created" | "owner";

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

export function renderCookieRoutesDirectoryBodyCell(
  col: HubDirectoryColumnDef<CookieRouteTableSortKey>,
  row: CookieAutoRow,
  vaultByKey: Record<string, CookieVaultRow>,
  shareCounts: Record<string, number> = {},
) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const vault = binding.noteId
    ? lookupVaultRow(vaultByKey, binding.noteId, binding.domain)
    : undefined;
  const icon = resolveCookieSiteIcon(binding.domain);
  const syncedIso = resolveRouteSyncedDisplayIso({ noteSyncedAt: note?.synced_at });
  const { key, colClass } = col;

  switch (key) {
    case "updated":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="align-top px-2 py-2">
          <CookieRouteChipRow
            binding={binding}
            syncStatus={status}
            noteSyncedAt={note?.synced_at}
            vaultCookieCount={vault?.cookie_count}
            shareCount={shareCounts[binding.noteId]}
          />
        </DirectoryTableBodyCell>
      );
    case "title":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="whitespace-nowrap px-3 py-2 align-top">
          <div className="flex items-center gap-2 font-medium text-[var(--text)]">
            {icon ? (
              <img
                src={icon.src}
                alt={icon.label}
                className="h-4 w-4 object-contain"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span>{binding.noteTitle ?? note?.title ?? "Untitled route"}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-indigo-300/90">{binding.domain}</div>
        </DirectoryTableBodyCell>
      );
    case "platform":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="px-3 py-2 align-top">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
              {binding.syncId || (binding.useNoteIdRpc ? "by UUID" : "—")}
            </code>
            <code className="rounded bg-white/[.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
              {binding.noteId ? `${binding.noteId.slice(0, 8)}…` : "no note"}
            </code>
          </div>
          <div className="mt-1 text-[10px] text-[var(--muted)]">
            {lines.length ? `${lines.length} cookie line(s)` : "Awaiting snapshot"} ·{" "}
            {note?.syncLabel ?? "not synced"}
          </div>
          {syncedIso ? (
            <div className="mt-0.5 text-[9px]">
              <HubActivityTimestampLabel at={syncedIso} />
            </div>
          ) : null}
        </DirectoryTableBodyCell>
      );
    case "created":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="px-2 py-2 align-top">
          {vault ? (
            <div>
              <div className="hub-directory-table-body-text font-medium text-[var(--text)]">
                {vault.cookie_count} cookie{vault.cookie_count === 1 ? "" : "s"}
              </div>
              <div className="mt-1 text-[10px]">
                <HubActivityTimestampLabel at={vault.updated_at} />
              </div>
              {vault.updated_by ? (
                <div
                  className="mt-0.5 max-w-[120px] truncate text-[9px] text-amber-200/80"
                  title={vault.updated_by}
                >
                  {vault.updated_by}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-[var(--muted)]">No vault</span>
          )}
        </DirectoryTableBodyCell>
      );
    case "owner":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="px-2 py-2 align-top text-[10px]">
          {binding.sourceBrowserId ? (
            <div>
              <HubDirectoryToolBadge
                label={shortId(binding.sourceBrowserId)}
                icon={LockKeyhole}
                title={binding.sourceLabel ?? binding.sourceBrowserId}
              />
              {binding.sourceLabel ? (
                <div className="mt-1 max-w-[150px] truncate text-[var(--muted)]" title={binding.sourceLabel}>
                  {binding.sourceLabel}
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <HubDirectoryToolBadge
                label="Owner"
                icon={LockKeyhole}
                title={binding.ownerUserId ?? resolveCookieRouteOwnerLabel(binding)}
              />
              <div
                className="mt-1 max-w-[150px] truncate text-[var(--muted)]"
                title={binding.ownerUserId ?? undefined}
              >
                Owner {resolveCookieRouteOwnerLabel(binding)}
              </div>
            </div>
          )}
        </DirectoryTableBodyCell>
      );
    default:
      return null;
  }
}
