import { CheckCircle2, XCircle } from "lucide-react";
import { HubRouteAccessDirectoryTable } from "@tool-workspace/hub-ui";
import { CookieAccessRoleBadge } from "./CookieAccessRoleBadge";
import { formatTimestampCompactOrDash } from "../../lib/format-timestamp";
import type { NoteCookieMemberRow } from "./noteCookieMembersRepository";

export type RouteAccessRow = {
  id: string;
  user: string;
  role: string;
  canApply: boolean;
  canPublish: boolean;
  expiresAt: string | null;
  member: NoteCookieMemberRow | null;
  selectable: boolean;
};

function formatExpires(value: string | null) {
  if (!value) return "No expiry";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function PermIcon({ allowed, label }: { allowed: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      title={allowed ? `${label}: allowed` : `${label}: not allowed`}
      aria-label={allowed ? `${label} allowed` : `${label} not allowed`}
    >
      {allowed ? (
        <CheckCircle2 size={15} className="text-emerald-400" strokeWidth={2.25} />
      ) : (
        <XCircle size={15} className="text-slate-500/90" strokeWidth={2.25} />
      )}
    </span>
  );
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
  return (
    <HubRouteAccessDirectoryTable
      items={rows}
      resetKey={resetKey}
      columnLayout="expanded"
      showRouteColumn={false}
      getRowKey={(row) => row.id}
      getUserDisplay={(row) => ({ label: row.user, title: row.user })}
      renderRoleCell={(row) => <CookieAccessRoleBadge role={row.role} />}
      canSelectRow={(row) => row.selectable}
      isSelected={(row) => selectedIds.has(row.id)}
      onToggleSelect={(row) => onToggleSelect(row.id)}
      onToggleSelectAll={onToggleSelectAll}
      allVisibleSelected={allVisibleSelected}
      renderSyncAtCell={(row) =>
        formatTimestampCompactOrDash(syncAtForRow(row.canPublish, row.id, row.member))
      }
      renderLoadAtCell={(row) => formatTimestampCompactOrDash(loadAtForRow(row.id, row.member))}
      renderLoadPermCell={(row) => <PermIcon allowed={row.canApply} label="Load" />}
      renderSyncPermCell={(row) => <PermIcon allowed={row.canPublish} label="Sync" />}
      renderExpiresCell={(row) => formatExpires(row.expiresAt)}
    />
  );
}
