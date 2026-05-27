import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FilterBar, type FilterDef, type FilterValues } from "../../components/sales-shell";
import { useNotesAuth } from "../notes/useNotesAuth";
import type { CookieBinding } from "./cookieBridge";
import { getCookieRoutePublishStatus } from "./cookieRoutesRepository";
import {
  listNoteCookieMembers,
  upsertNoteCookieMember,
  type NoteCookieMemberRow,
} from "./noteCookieMembersRepository";

type Props = {
  binding: CookieBinding;
  onToast?: (message: string, tone?: "success" | "error" | "warn") => void;
  onShared?: () => void;
};

type PublishedState = {
  published: boolean;
  updatedAt: string | null;
};

const ACCESS_FILTER_DEFS: FilterDef[] = [
  {
    key: "role",
    label: "Role",
    showAllLabel: true,
    options: [
      { value: "owner", label: "Owner", color: "#a78bfa" },
      { value: "member", label: "Member", color: "#94a3b8" },
      { value: "employee", label: "Employee", color: "#38bdf8" },
      { value: "publisher", label: "Publisher", color: "#f59e0b" },
      { value: "manager", label: "Manager", color: "#34d399" },
    ],
  },
  {
    key: "permission",
    label: "Permission",
    showAllLabel: true,
    options: [
      { value: "apply", label: "Can apply", color: "#34d399" },
      { value: "publish", label: "Can publish", color: "#818cf8" },
      { value: "manage", label: "Can manage", color: "#22c55e" },
    ],
  },
  {
    key: "status",
    label: "Route",
    showAllLabel: true,
    options: [
      { value: "published", label: "Published", color: "#818cf8" },
      { value: "missing", label: "Missing", color: "#f59e0b" },
    ],
  },
];

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

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "emerald" | "indigo" | "amber" | "rose" | "slate" }) {
  return <span className={`rdp-pill rdp-pill--${tone}`}>{children}</span>;
}

function memberUser(member: NoteCookieMemberRow) {
  return member.grantee_email ?? member.grantee_user_id ?? "shared-user";
}

function memberRole(member: NoteCookieMemberRow) {
  if (member.can_manage) return "Manager";
  if (member.can_publish) return "Publisher";
  return "Employee";
}

function normalizedRole(role: string) {
  return role.toLowerCase();
}

type ShareRole = "load" | "sync" | "manager";

function sharePermissions(role: ShareRole) {
  return {
    canApply: true,
    canPublish: role === "sync" || role === "manager",
    canManage: role === "manager",
  };
}

export function CookieRouteMembers({ binding, onToast, onShared }: Props) {
  const { session } = useNotesAuth();
  const [members, setMembers] = useState<NoteCookieMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishedState, setPublishedState] = useState<PublishedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("load");
  const [shareBusy, setShareBusy] = useState(false);

  const loadPublishStatus = useCallback(async () => {
    if (binding.accessRole === "member") {
      setPublishedState({ published: true, updatedAt: null });
      return;
    }
    const res = await getCookieRoutePublishStatus(session, binding);
    if (!res.ok) {
      setPublishedState(null);
      setError(res.error);
      return;
    }
    setPublishedState({ published: res.published, updatedAt: res.updatedAt });
  }, [binding, session]);

  const load = useCallback(async () => {
    if (!binding.noteId) return;
    setLoading(true);
    setError(null);
    const [res] = await Promise.all([listNoteCookieMembers(binding.noteId), loadPublishStatus()]);
    setLoading(false);
    if (!res.ok) {
      setMembers([]);
      setError(res.error);
      return;
    }
    setMembers(res.members);
  }, [binding.noteId, loadPublishStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const routePublished = publishedState?.published === true;
  const publishedLabel = routePublished ? "published" : "missing";
  const publishedHint = publishedState?.updatedAt
    ? new Date(publishedState.updatedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : routePublished
      ? "Accessible route"
      : "Needs re-publish";
  const ownerLabel =
    binding.accessRole === "member"
      ? binding.ownerUserEmail ?? binding.ownerUserId ?? "Route owner"
      : binding.ownerUserEmail ?? session?.user.email ?? binding.ownerUserId ?? "admin@workspace.local";
  const accessRows = useMemo(
    () => [
      {
        id: "owner",
        user: ownerLabel,
        role: "Owner",
        canApply: true,
        canPublish: true,
        canManage: true,
        expiresAt: null as string | null,
        member: null as NoteCookieMemberRow | null,
      },
      ...members.map((member) => ({
        id: member.id,
        user: memberUser(member),
        role: memberRole(member),
        canApply: member.can_apply,
        canPublish: member.can_publish,
        canManage: member.can_manage,
        expiresAt: member.expires_at,
        member,
      })),
    ],
    [binding.accessRole, binding.canApply, binding.canManage, binding.canPublish, members, ownerLabel],
  );
  const filteredAccessRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const roleFilters = filterValues.role ?? [];
    const permissionFilters = filterValues.permission ?? [];
    const routeFilters = filterValues.status ?? [];
    const routeState = routePublished ? "published" : "missing";

    return accessRows.filter((row) => {
      const haystack = [row.user, row.role, routeState, formatExpires(row.expiresAt)].join(" ").toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (roleFilters.length && !roleFilters.includes(normalizedRole(row.role))) return false;
      if (routeFilters.length && !routeFilters.includes(routeState)) return false;
      if (permissionFilters.length) {
        const permissions = [
          row.canApply ? "apply" : null,
          row.canPublish ? "publish" : null,
          row.canManage ? "manage" : null,
        ].filter((value): value is string => Boolean(value));
        if (!permissionFilters.some((value) => permissions.includes(value))) return false;
      }
      return true;
    });
  }, [accessRows, filterValues, query, routePublished]);
  const canShare = binding.accessRole !== "member" && binding.canManage !== false;

  const submitShare = useCallback(async () => {
    if (!binding.noteId || !shareEmail.trim() || shareBusy) return;
    setShareBusy(true);
    const res = await upsertNoteCookieMember({
      noteId: binding.noteId,
      email: shareEmail,
      ...sharePermissions(shareRole),
    });
    setShareBusy(false);
    if (!res.ok) {
      setError(res.error);
      onToast?.(res.error, "error");
      return;
    }
    setShareEmail("");
    onToast?.("Shared route access. Recipient can refresh routes immediately.", "success");
    await load();
    window.dispatchEvent(new CustomEvent("p0020-cookie-route-shared", { detail: { noteId: binding.noteId } }));
    onShared?.();
  }, [binding.noteId, load, onShared, onToast, shareBusy, shareEmail, shareRole]);

  return (
    <section className="rdp-section">
      <div className="rdp-section-head">
        <h4>Access & browser agents</h4>
        <span>Note ID is the permission key</span>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
          {error}
        </p>
      ) : null}

      {canShare ? (
        <div className="mb-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.06] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-emerald-100">Share user</p>
              <p className="text-[10px] text-emerald-100/65">Grant access by email. Note ID remains the invite key.</p>
            </div>
            <span className="rounded-full border border-emerald-300/25 px-2 py-0.5 text-[10px] text-emerald-100/80">
              {binding.noteId.slice(0, 8)}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_auto]">
            <input
              className="field text-[12px]"
              value={shareEmail}
              placeholder="user@example.com"
              onChange={(event) => setShareEmail(event.target.value)}
            />
            <select
              className="field text-[12px]"
              value={shareRole}
              onChange={(event) => setShareRole(event.target.value as ShareRole)}
            >
              <option value="load">Load only</option>
              <option value="sync">Can sync</option>
              <option value="manager">Manager</option>
            </select>
            <button type="button" className="btn text-[11px]" disabled={!shareEmail.trim() || shareBusy} onClick={() => void submitShare()}>
              {shareBusy ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-3">
        <FilterBar
          placeholder="Search access by user, role, route..."
          filters={ACCESS_FILTER_DEFS}
          query={query}
          onQueryChange={setQuery}
          values={filterValues}
          onValuesChange={setFilterValues}
          trailing={<span className="hidden text-[10px] text-[var(--muted)] sm:inline">{filteredAccessRows.length}/{accessRows.length}</span>}
        />
      </div>

      <div className="rdp-table-wrap">
        <table className="rdp-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Apply</th>
              <th>Publish</th>
              <th>Manage</th>
              <th>Route</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccessRows.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.user}</td>
                <td>{row.role}</td>
                <td>
                  <Pill tone={row.canApply ? "emerald" : "slate"}>{row.canApply ? "yes" : "no"}</Pill>
                </td>
                <td>
                  <Pill tone={row.canPublish ? "emerald" : "slate"}>{row.canPublish ? "yes" : "no"}</Pill>
                </td>
                <td>
                  <Pill tone={row.canManage ? "emerald" : "slate"}>{row.canManage ? "yes" : "no"}</Pill>
                </td>
                <td>
                  <Pill tone={routePublished ? "indigo" : "amber"}>{publishedLabel}</Pill>
                </td>
                <td>{formatExpires(row.expiresAt)}</td>
              </tr>
            ))}
            {filteredAccessRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-[var(--muted)]">
                  No access rows match search or filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {loading ? <p className="mt-2 text-[11px] text-[var(--muted)]">Loading members...</p> : null}
      {publishedHint ? <span className="sr-only">{publishedHint}</span> : null}
    </section>
  );
}
