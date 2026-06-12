import {
  HubRouteAccessDirectoryTable,
  type HubRouteAccessSortKey,
} from "@tool-workspace/hub-ui";
import { CookieAccessRoleBadge } from "./CookieAccessRoleBadge";
import {
  formatTimestampCompactOrDash,
  formatTimestampFull,
} from "../../lib/format-timestamp";
import type { NoteCookieMemberRow } from "./noteCookieMembersRepository";

export type RouteAccessRow = {
  id: string;
  user: string;
  role: string;
  canApply: boolean;
  canPublish: boolean;
  addedAt: string | null;
  expiresAt: string | null;
  member: NoteCookieMemberRow | null;
  selectable: boolean;
};

function TimestampCell({ iso }: { iso: string | null }) {
  if (!iso) return <>—</>;
  const text = formatTimestampCompactOrDash(iso);
  const full = formatTimestampFull(iso);
  return <span title={full || undefined}>{text}</span>;
}

function ExpiresCell({ iso }: { iso: string | null }) {
  if (!iso) return <>No expiry</>;
  const text = formatTimestampCompactOrDash(iso);
  const full = formatTimestampFull(iso);
  return <span title={full || undefined}>{text}</span>;
}

/** Access column — Owner or shared Load / Sync badges (golden filter labels). */
export function CookieRouteAccessCell({ row }: { row: RouteAccessRow }) {
  if (row.id === "owner" || row.role.toLowerCase() === "owner") {
    return <CookieAccessRoleBadge role="Owner" />;
  }

  const badges: { key: string; label: "Load" | "Sync" }[] = [];
  if (row.canApply) badges.push({ key: "load", label: "Load" });
  if (row.canPublish) badges.push({ key: "sync", label: "Sync" });

  if (badges.length === 0) {
    return <CookieAccessRoleBadge role={row.role} />;
  }
  if (badges.length === 1) {
    return <CookieAccessRoleBadge role={badges[0].label} />;
  }

  return (
    <span className="hub-route-access-rights">
      {badges.map(({ key, label }) => (
        <CookieAccessRoleBadge key={key} role={label} />
      ))}
    </span>
  );
}

function accessSortValue(row: RouteAccessRow): string {
  if (row.id === "owner" || row.role.toLowerCase() === "owner") return "0-owner";
  const parts = [row.canApply ? "load" : null, row.canPublish ? "sync" : null].filter(Boolean);
  return parts.length ? parts.join("+") : row.role.toLowerCase();
}

type Props = {
  rows: RouteAccessRow[];
  resetKey?: string | number | boolean | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  syncAtForRow: (canPublish: boolean, rowId: string, member: NoteCookieMemberRow | null) => string | null;
  loadAtForRow: (rowId: string, member: NoteCookieMemberRow | null) => string | null;
};

export function CookieRouteAccessTable({
  rows,
  resetKey,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  syncAtForRow,
  loadAtForRow,
}: Props) {
  const getSortValue = (row: RouteAccessRow, key: HubRouteAccessSortKey): string | number => {
    switch (key) {
      case "user":
        return row.user.toLowerCase();
      case "role":
        return accessSortValue(row);
      case "syncAt":
        return syncAtForRow(row.canPublish, row.id, row.member) ?? "";
      case "loadAt":
        return loadAtForRow(row.id, row.member) ?? "";
      case "addedAt":
        return row.addedAt ?? "";
      case "expires":
        return row.expiresAt ?? "";
      default:
        return "";
    }
  };

  return (
    <HubRouteAccessDirectoryTable
      items={rows}
      resetKey={resetKey}
      columnLayout="expanded"
      showRouteColumn={false}
      getRowKey={(row) => row.id}
      getUserDisplay={(row) => ({ label: row.user, title: row.user })}
      renderRoleCell={(row) => <CookieRouteAccessCell row={row} />}
      canSelectRow={(row) => row.selectable}
      isSelected={(row) => selectedIds.has(row.id)}
      onToggleSelect={(row) => onToggleSelect(row.id)}
      onToggleSelectAll={onToggleSelectAll}
      allVisibleSelected={allVisibleSelected}
      getSortValue={getSortValue}
      defaultSortKey="user"
      renderSyncAtCell={(row) => (
        <TimestampCell iso={syncAtForRow(row.canPublish, row.id, row.member)} />
      )}
      renderLoadAtCell={(row) => <TimestampCell iso={loadAtForRow(row.id, row.member)} />}
      renderAddedAtCell={(row) => <TimestampCell iso={row.addedAt} />}
      renderExpiresCell={(row) => <ExpiresCell iso={row.expiresAt} />}
    />
  );
}
