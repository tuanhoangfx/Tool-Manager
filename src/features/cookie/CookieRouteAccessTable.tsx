import {
  CheckCircle2,
  Clock,
  Download,
  Route,
  Shield,
  Upload,
  User,
  XCircle,
} from "lucide-react";
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

function Pill({ children, tone = "slate" }: { children: string; tone?: "indigo" | "amber" | "slate" }) {
  return <span className={`rdp-pill rdp-pill--${tone}`}>{children}</span>;
}

type Props = {
  rows: RouteAccessRow[];
  routePublished: boolean;
  publishedLabel: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  syncAtForRow: (canPublish: boolean, rowId: string, member: NoteCookieMemberRow | null) => string | null;
  loadAtForRow: (rowId: string, member: NoteCookieMemberRow | null) => string | null;
};

export function CookieRouteAccessTable({
  rows,
  routePublished,
  publishedLabel,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  syncAtForRow,
  loadAtForRow,
}: Props) {
  const selectableRows = rows.filter((r) => r.selectable);

  return (
    <div className="hub-users-table-wrap rounded-2xl border border-white/5">
      <table className="hub-users-table hub-users-table--route-access">
        <colgroup>
          <col className="hub-users-col--select" />
          <col className="hub-route-access-col--user" />
          <col className="hub-route-access-col--role" />
          <col className="hub-route-access-col--sync-at" />
          <col className="hub-route-access-col--load-at" />
          <col className="hub-route-access-col--perm" />
          <col className="hub-route-access-col--perm" />
          <col className="hub-route-access-col--route" />
          <col className="hub-route-access-col--expires" />
        </colgroup>
        <thead>
          <tr>
            <th className="hub-users-col--select" scope="col">
              <label className="hub-users-select-all">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={selectableRows.length > 0 && allVisibleSelected}
                  disabled={!selectableRows.length}
                  onChange={onToggleSelectAll}
                  aria-label="Select all visible members"
                />
              </label>
            </th>
            <th className="hub-route-access-col--user" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static hub-users-th-btn--align-start">
                <span className="hub-users-th-label hub-users-th-label--start">
                  <User size={13} className="hub-users-th-icon hub-users-th-icon--name" aria-hidden />
                  <span className="hub-users-th-text">User</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--role" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static">
                <span className="hub-users-th-label">
                  <Shield size={13} className="hub-users-th-icon hub-users-th-icon--role" aria-hidden />
                  <span className="hub-users-th-text">Access</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--sync-at" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static" title="Last Sync to cloud vault">
                <span className="hub-users-th-label">
                  <Clock size={13} className="hub-users-th-icon hub-users-th-icon--activity" aria-hidden />
                  <span className="hub-users-th-text">Synced</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--load-at" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static" title="Last Load on extension">
                <span className="hub-users-th-label">
                  <Download size={13} className="hub-users-th-icon hub-users-th-icon--tools" aria-hidden />
                  <span className="hub-users-th-text">Loaded</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--perm" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static" title="Load cookies from vault">
                <span className="hub-users-th-label">
                  <Download size={13} className="hub-users-th-icon hub-users-th-icon--tools" aria-hidden />
                  <span className="hub-users-th-text">Load</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--perm" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static" title="Upload cookies to vault">
                <span className="hub-users-th-label">
                  <Upload size={13} className="hub-users-th-icon hub-users-th-icon--email" aria-hidden />
                  <span className="hub-users-th-text">Sync</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--route" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static">
                <span className="hub-users-th-label">
                  <Route size={13} className="hub-users-th-icon hub-users-th-icon--id" aria-hidden />
                  <span className="hub-users-th-text">Route</span>
                </span>
              </span>
            </th>
            <th className="hub-route-access-col--expires" scope="col">
              <span className="hub-users-th-btn hub-users-th-btn--static">
                <span className="hub-users-th-label">
                  <Clock size={13} className="hub-users-th-icon hub-users-th-icon--created" aria-hidden />
                  <span className="hub-users-th-text">Expires</span>
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedIds.has(row.id);
            const syncAt = formatTimestampCompactOrDash(
              syncAtForRow(row.canPublish, row.id, row.member),
            );
            const loadAt = formatTimestampCompactOrDash(loadAtForRow(row.id, row.member));
            return (
              <tr
                key={row.id}
                className={`hub-users-row hub-users-row--static${selected ? " is-selected" : ""}`}
              >
                <td className="hub-users-col--select" onClick={(e) => e.stopPropagation()}>
                  {row.selectable ? (
                    <label className="hub-users-select-row">
                      <input
                        type="checkbox"
                        className="hub-checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect(row.id)}
                        aria-label={`Select ${row.user}`}
                      />
                    </label>
                  ) : null}
                </td>
                <td className="hub-route-access-col--user mono text-left">{row.user}</td>
                <td className="hub-route-access-col--role">
                  <div className="hub-users-role-cell">
                    <CookieAccessRoleBadge role={row.role} />
                  </div>
                </td>
                <td className="hub-route-access-col--sync-at hub-users-cell-muted">{syncAt}</td>
                <td className="hub-route-access-col--load-at hub-users-cell-muted">{loadAt}</td>
                <td className="hub-route-access-col--perm">
                  <PermIcon allowed={row.canApply} label="Load" />
                </td>
                <td className="hub-route-access-col--perm">
                  <PermIcon allowed={row.canPublish} label="Sync" />
                </td>
                <td className="hub-route-access-col--route">
                  <Pill tone={routePublished ? "indigo" : "amber"}>{publishedLabel}</Pill>
                </td>
                <td className="hub-route-access-col--expires hub-users-cell-muted">
                  {formatExpires(row.expiresAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="hub-users-empty">No access rows match search or filters.</div>
      ) : null}
    </div>
  );
}
