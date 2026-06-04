import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Mail, Save, Shield, UserPlus, Users } from "lucide-react";
import { FilterBar, HubFilterSingleSelect, type FilterDef, type FilterValues } from "../../components/sales-shell";
import { ToolConfirmDialog } from "../../components/confirm/ToolConfirmDialog";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { useNotesAuth } from "../notes/useNotesAuth";
import type { CookieBinding } from "./cookieBridge";
import { getCookieRoutePublishStatus } from "./cookieRoutesRepository";
import {
  listNoteCookieMembers,
  revokeNoteCookieMember,
  upsertNoteCookieMember,
  type NoteCookieMemberRow,
} from "./noteCookieMembersRepository";
import { supabase } from "../../lib/supabase";
import { listCookieRouteActivity } from "./cookieRouteActivityRepository";
import { cookieRouteDomainKey } from "./cookieRouteDomain";
import { CookieRouteAccessBulkActionBar } from "./CookieRouteAccessBulkActionBar";
import { CookieRouteAccessTable, type RouteAccessRow } from "./CookieRouteAccessTable";
import { CookieRouteFieldLabel, CookieRouteModalActions } from "./CookieRouteFormModal";
import { COOKIE_ACCESS_SELECT_OPTIONS } from "./cookieAccessSelectOptions";

type Props = {
  binding: CookieBinding;
  vault?: CookieVaultRow;
  noteSyncedAt?: string | null;
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
    label: "Access",
    showAllLabel: true,
    options: [
      { value: "owner", label: "Owner", color: "#a78bfa" },
      { value: "load", label: "Load", color: "#38bdf8" },
      { value: "sync", label: "Sync", color: "#818cf8" },
    ],
  },
  {
    key: "permission",
    label: "Permission",
    showAllLabel: true,
    options: [
      { value: "load", label: "Load", color: "#34d399" },
      { value: "sync", label: "Sync", color: "#818cf8" },
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

type ShareAccess = "load" | "sync";

function memberUser(member: NoteCookieMemberRow) {
  return member.grantee_email ?? member.grantee_user_id ?? "shared-user";
}

function memberAccessRole(member: NoteCookieMemberRow) {
  return member.can_publish ? "Sync" : "Load";
}

function shareAccessFromMember(member: NoteCookieMemberRow): ShareAccess {
  return member.can_publish ? "sync" : "load";
}

function normalizedRole(role: string) {
  return role.toLowerCase();
}

function sharePermissions(access: ShareAccess) {
  return {
    canApply: true,
    canPublish: access === "sync",
    canManage: false,
  };
}

export function CookieRouteMembers({ binding, noteSyncedAt, onToast, onShared }: Props) {
  const { session } = useNotesAuth();
  const shareEmailRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<NoteCookieMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishedState, setPublishedState] = useState<PublishedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccess, setShareAccess] = useState<ShareAccess>("load");
  const [shareBusy, setShareBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingMember, setEditingMember] = useState<NoteCookieMemberRow | null>(null);
  const [editAccess, setEditAccess] = useState<ShareAccess>("load");
  const [editBusy, setEditBusy] = useState(false);
  const [pendingRevokeIds, setPendingRevokeIds] = useState<string[] | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [loadByUserId, setLoadByUserId] = useState<Record<string, string>>({});
  const [loadByEmail, setLoadByEmail] = useState<Record<string, string>>({});
  const [syncByUserId, setSyncByUserId] = useState<Record<string, string>>({});
  const [syncByEmail, setSyncByEmail] = useState<Record<string, string>>({});

  const routeManualSyncAt = noteSyncedAt?.trim() || null;
  const canShare = binding.accessRole !== "member" && binding.canManage !== false;

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

  const loadActivity = useCallback(async () => {
    if (!binding.noteId?.trim() || !binding.domain?.trim()) {
      setLoadByUserId({});
      setLoadByEmail({});
      setSyncByUserId({});
      setSyncByEmail({});
      return;
    }
    const res = await listCookieRouteActivity(binding.noteId, cookieRouteDomainKey(binding.domain));
    if (!res.ok) {
      setLoadByUserId({});
      setLoadByEmail({});
      setSyncByUserId({});
      setSyncByEmail({});
      return;
    }
    const nextLoadId: Record<string, string> = {};
    const nextLoadEmail: Record<string, string> = {};
    const nextSyncId: Record<string, string> = {};
    const nextSyncEmail: Record<string, string> = {};
    for (const row of res.activities) {
      if (row.user_id && row.last_load_at) nextLoadId[row.user_id] = row.last_load_at;
      if (row.user_email && row.last_load_at) nextLoadEmail[row.user_email] = row.last_load_at;
      if (row.user_id && row.last_sync_at) nextSyncId[row.user_id] = row.last_sync_at;
      if (row.user_email && row.last_sync_at) nextSyncEmail[row.user_email] = row.last_sync_at;
    }
    setLoadByUserId(nextLoadId);
    setLoadByEmail(nextLoadEmail);
    setSyncByUserId(nextSyncId);
    setSyncByEmail(nextSyncEmail);
  }, [binding.domain, binding.noteId]);

  const load = useCallback(async () => {
    if (!binding.noteId) return;
    setLoading(true);
    setError(null);
    const [membersRes] = await Promise.all([
      listNoteCookieMembers(binding.noteId),
      loadPublishStatus(),
      loadActivity(),
    ]);
    setLoading(false);
    if (!membersRes.ok) {
      setMembers([]);
      if (binding.accessRole !== "member") setError(membersRes.error);
    } else {
      setMembers(membersRes.members);
    }
  }, [binding.accessRole, binding.noteId, loadActivity, loadPublishStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const noteId = binding.noteId?.trim();
    if (!noteId) return;

    const onRefresh = () => {
      void loadActivity();
      window.dispatchEvent(
        new CustomEvent("p0020-cookie-route-activity", { detail: { noteId } }),
      );
    };
    const onVis = () => {
      if (document.visibilityState === "visible") void loadActivity();
    };
    window.addEventListener("p0020-cookie-route-shared", onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVis);
    const poll = window.setInterval(onRefresh, 10_000);

    let activityChannel: RealtimeChannel | null = null;
    const domainKey = cookieRouteDomainKey(binding.domain);
    activityChannel = supabase
      .channel(`route-activity:${noteId}:${domainKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cookie_route_user_activity",
          filter: `note_id=eq.${noteId}`,
        },
        onRefresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void loadActivity();
      });

    return () => {
      window.removeEventListener("p0020-cookie-route-shared", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(poll);
      if (activityChannel) void supabase.removeChannel(activityChannel);
    };
  }, [binding.domain, binding.noteId, loadActivity]);

  const routePublished = publishedState?.published === true;
  const ownerUserId = binding.ownerUserId ?? null;
  const ownerEmail = (binding.ownerUserEmail ?? "").trim().toLowerCase();
  const publishedLabel = routePublished ? "Published" : "Missing";

  const activityForRow = useCallback(
    (
      rowId: string,
      member: NoteCookieMemberRow | null,
      byUserId: Record<string, string>,
      byEmail: Record<string, string>,
    ) => {
      if (rowId === "owner") {
        if (ownerUserId && byUserId[ownerUserId]) return byUserId[ownerUserId];
        if (ownerEmail && byEmail[ownerEmail]) return byEmail[ownerEmail];
        return null;
      }
      const uid = member?.grantee_user_id;
      if (uid && byUserId[uid]) return byUserId[uid];
      const email = member?.grantee_email?.trim().toLowerCase();
      if (email && byEmail[email]) return byEmail[email];
      if (email) {
        for (const [actEmail, at] of Object.entries(byEmail)) {
          if (actEmail === email || actEmail.endsWith(`@${email}`) || actEmail.includes(email)) {
            return at;
          }
        }
      }
      return null;
    },
    [ownerEmail, ownerUserId],
  );

  const syncAtForRow = useCallback(
    (canPublish: boolean, rowId: string, member: NoteCookieMemberRow | null) => {
      if (!canPublish) return null;
      const tracked = activityForRow(rowId, member, syncByUserId, syncByEmail);
      if (tracked) return tracked;
      if (rowId === "owner" && routeManualSyncAt) return routeManualSyncAt;
      return null;
    },
    [activityForRow, routeManualSyncAt, syncByEmail, syncByUserId],
  );

  const loadAtForRow = useCallback(
    (rowId: string, member: NoteCookieMemberRow | null) =>
      activityForRow(rowId, member, loadByUserId, loadByEmail),
    [activityForRow, loadByEmail, loadByUserId],
  );

  const ownerLabel =
    binding.accessRole === "member"
      ? binding.ownerUserEmail ?? binding.ownerUserId ?? "Route owner"
      : binding.ownerUserEmail ?? session?.user.email ?? binding.ownerUserId ?? "admin@workspace.local";

  const accessRows = useMemo<RouteAccessRow[]>(
    () => [
      {
        id: "owner",
        user: ownerLabel,
        role: "Owner",
        canApply: true,
        canPublish: true,
        expiresAt: null,
        member: null,
        selectable: false,
      },
      ...members.map((member) => ({
        id: member.id,
        user: memberUser(member),
        role: memberAccessRole(member),
        canApply: member.can_apply,
        canPublish: member.can_publish,
        expiresAt: member.expires_at,
        member,
        selectable: true,
      })),
    ],
    [members, ownerLabel],
  );

  const filteredAccessRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const roleFilters = filterValues.role ?? [];
    const permissionFilters = filterValues.permission ?? [];
    const routeFilters = filterValues.status ?? [];
    const routeState = routePublished ? "published" : "missing";

    return accessRows.filter((row) => {
      const haystack = [row.user, row.role, routeState].join(" ").toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (roleFilters.length && !roleFilters.includes(normalizedRole(row.role))) return false;
      if (routeFilters.length && !routeFilters.includes(routeState)) return false;
      if (permissionFilters.length) {
        const permissions = [
          row.canApply ? "load" : null,
          row.canPublish ? "sync" : null,
        ].filter((value): value is string => Boolean(value));
        if (!permissionFilters.some((value) => permissions.includes(value))) return false;
      }
      return true;
    });
  }, [accessRows, filterValues, query, routePublished]);

  const selectableFiltered = useMemo(
    () => filteredAccessRows.filter((r) => r.selectable),
    [filteredAccessRows],
  );

  const allVisibleSelected =
    selectableFiltered.length > 0 && selectableFiltered.every((r) => selectedIds.has(r.id));

  useEffect(() => {
    const visible = new Set(selectableFiltered.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [selectableFiltered]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (selectableFiltered.every((r) => prev.has(r.id))) {
        const next = new Set(prev);
        selectableFiltered.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      selectableFiltered.forEach((r) => next.add(r.id));
      return next;
    });
  }, [selectableFiltered]);

  const submitShare = useCallback(async () => {
    if (!binding.noteId || !shareEmail.trim() || shareBusy) return;
    setShareBusy(true);
    const res = await upsertNoteCookieMember({
      noteId: binding.noteId,
      email: shareEmail,
      ...sharePermissions(shareAccess),
    });
    setShareBusy(false);
    if (!res.ok) {
      setError(res.error);
      onToast?.(res.error, "error");
      return;
    }
    setShareEmail("");
    setShareAccess("load");
    onToast?.("Shared route access. Recipient can refresh routes immediately.", "success");
    await load();
    window.dispatchEvent(new CustomEvent("p0020-cookie-route-shared", { detail: { noteId: binding.noteId } }));
    onShared?.();
  }, [binding.noteId, load, onShared, onToast, shareAccess, shareBusy, shareEmail]);

  const saveEdit = useCallback(async () => {
    if (!binding.noteId || !editingMember?.grantee_email?.trim() || editBusy) return;
    setEditBusy(true);
    const res = await upsertNoteCookieMember({
      noteId: binding.noteId,
      email: editingMember.grantee_email,
      ...sharePermissions(editAccess),
      expiresAt: editingMember.expires_at,
    });
    setEditBusy(false);
    if (!res.ok) {
      onToast?.(res.error, "error");
      return;
    }
    setEditingMember(null);
    onToast?.("Access updated.", "success");
    await load();
    window.dispatchEvent(new CustomEvent("p0020-cookie-route-shared", { detail: { noteId: binding.noteId } }));
    onShared?.();
  }, [binding.noteId, editAccess, editBusy, editingMember, load, onShared, onToast]);

  const confirmRevoke = useCallback(async () => {
    const ids = pendingRevokeIds;
    if (!ids?.length) return;
    setRevokeBusy(true);
    let ok = 0;
    let lastError = "";
    for (const id of ids) {
      const res = await revokeNoteCookieMember(id);
      if (res.ok) ok += 1;
      else lastError = res.error;
    }
    setRevokeBusy(false);
    setPendingRevokeIds(null);
    setSelectedIds(new Set());
    if (!ok) {
      onToast?.(lastError || "Revoke failed.", "error");
      return;
    }
    onToast?.(`Revoked access for ${ok} member(s).`, "success");
    await load();
    window.dispatchEvent(new CustomEvent("p0020-cookie-route-shared", { detail: { noteId: binding.noteId } }));
    onShared?.();
  }, [binding.noteId, load, onShared, onToast, pendingRevokeIds]);

  const openEditForRow = useCallback((row: RouteAccessRow) => {
    if (!row.member) return;
    setEditingMember(row.member);
    setEditAccess(shareAccessFromMember(row.member));
    setSelectedIds(new Set([row.id]));
  }, []);

  const openEditBulk = useCallback(() => {
    const id = [...selectedIds][0];
    const row = accessRows.find((r) => r.id === id);
    if (row?.member) openEditForRow(row);
  }, [accessRows, openEditForRow, selectedIds]);

  const requestRevoke = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setPendingRevokeIds(ids);
  }, []);

  const focusShare = useCallback(() => {
    shareEmailRef.current?.focus();
    shareEmailRef.current?.select();
  }, []);

  return (
    <section className="rdp-section">
      <div className="rdp-section-head rdp-section-head--with-icon">
        <span className="rdp-section-icon rdp-emerald">
          <Users size={14} />
        </span>
        <div className="min-w-0">
          <h4>People & access</h4>
        </div>
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
              <p className="text-[10px] text-emerald-100/65">
                Grant <strong>Load</strong> or <strong>Sync</strong> by email. Manage stays with route owner only.
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/25 px-2 py-0.5 text-[10px] text-emerald-100/80">
              {binding.noteId.slice(0, 8)}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block min-w-0">
              <CookieRouteFieldLabel icon={Mail}>User email</CookieRouteFieldLabel>
              <input
                ref={shareEmailRef}
                className="field auth-gate-field w-full"
                value={shareEmail}
                placeholder="user@example.com"
                onChange={(event) => setShareEmail(event.target.value)}
              />
            </label>
            <label className="block min-w-0">
              <CookieRouteFieldLabel icon={Shield}>Access</CookieRouteFieldLabel>
              <HubFilterSingleSelect
                value={shareAccess}
                options={COOKIE_ACCESS_SELECT_OPTIONS}
                onChange={(v) => setShareAccess(v as ShareAccess)}
                filterLabel="access"
                TriggerIcon={Shield}
              />
            </label>
            <button
              type="button"
              className="auth-gate-submit cookie-route-modal__btn mt-5 h-[var(--hub-control-h,34px)] shrink-0 px-4 text-xs"
              disabled={!shareEmail.trim() || shareBusy}
              onClick={() => void submitShare()}
            >
              <UserPlus size={14} aria-hidden />
              {shareBusy ? "Sharing…" : "Share"}
            </button>
          </div>
        </div>
      ) : null}

      {editingMember ? (
        <div className="mb-3 rounded-2xl border border-indigo-400/22 bg-indigo-500/[.08] p-3">
          <p className="cookie-route-form-modal__eyebrow">Member access</p>
          <p className="cookie-route-form-modal__title !text-base">Edit access</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="block min-w-0">
              <CookieRouteFieldLabel icon={Mail}>User email</CookieRouteFieldLabel>
              <input
                className="field auth-gate-field w-full opacity-80"
                value={editingMember.grantee_email ?? ""}
                readOnly
              />
            </label>
            <label className="block min-w-0">
              <CookieRouteFieldLabel icon={Shield}>Access</CookieRouteFieldLabel>
              <HubFilterSingleSelect
                value={editAccess}
                options={COOKIE_ACCESS_SELECT_OPTIONS}
                onChange={(v) => setEditAccess(v as ShareAccess)}
                filterLabel="access"
                TriggerIcon={Shield}
              />
            </label>
          </div>
          <div className="mt-3">
            <CookieRouteModalActions
              primaryLabel="Save"
              primaryIcon={Save}
              primaryBusy={editBusy}
              onPrimary={() => void saveEdit()}
              onSecondary={() => setEditingMember(null)}
            />
          </div>
        </div>
      ) : null}

      <div className="mb-3">
        <FilterBar
          layout="hub"
          placeholder="Search access by user, role, route..."
          filters={ACCESS_FILTER_DEFS}
          query={query}
          onQueryChange={setQuery}
          values={filterValues}
          onValuesChange={setFilterValues}
          toolbar={
            <span className="text-[10px] text-[var(--muted)] tabular-nums">
              {filteredAccessRows.length}/{accessRows.length}
            </span>
          }
          filterToolbar={
            canShare ? (
              <CookieRouteAccessBulkActionBar
                hasSelection={selectedIds.size > 0}
                selectedCount={selectedIds.size}
                canManage={canShare}
                shareBusy={shareBusy || revokeBusy}
                onAdd={focusShare}
                onEdit={openEditBulk}
                onDelete={() => requestRevoke([...selectedIds])}
              />
            ) : null
          }
        />
      </div>

      <CookieRouteAccessTable
        rows={filteredAccessRows}
        routePublished={routePublished}
        publishedLabel={publishedLabel}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        allVisibleSelected={allVisibleSelected}
        syncAtForRow={syncAtForRow}
        loadAtForRow={loadAtForRow}
      />

      {loading ? <p className="mt-2 text-[11px] text-[var(--muted)]">Loading members...</p> : null}

      <ToolConfirmDialog
        open={pendingRevokeIds !== null}
        title="Revoke route access"
        message={
          pendingRevokeIds?.length === 1
            ? "Remove this member from the route? They will lose Load/Sync access immediately."
            : `Remove ${pendingRevokeIds?.length ?? 0} members from this route?`
        }
        confirmLabel={revokeBusy ? "Revoking..." : "Revoke"}
        onConfirm={() => {
          if (!revokeBusy) void confirmRevoke();
        }}
        onClose={() => {
          if (!revokeBusy) setPendingRevokeIds(null);
        }}
      />
    </section>
  );
}
