import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Mail, Save, Shield, UserPlus, Users } from "lucide-react";
import {
  FilterBar,
  HubSingleFilterDropdown,
  type FilterValues,
} from "../../components/sales-shell";
import { ACCESS_FILTER_DEFS, accessFiltersWithCounts } from "./access-filter-counts";
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
import { CookieRouteAccessTableSkeleton } from "./CookieRouteAccessTableSkeleton";
import {
  CookieRouteFieldLabel,
  CookieRouteFormModal,
  CookieRouteModalActions,
  CookieRouteModalSection,
} from "./CookieRouteFormModal";
import {
  COOKIE_ROUTE_EDIT_MEMBER_TOC,
  COOKIE_ROUTE_SHARE_TOC,
  cookieRouteSectionTitle,
} from "./cookie-route-form-toc";
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
  const [members, setMembers] = useState<NoteCookieMemberRow[]>([]);
  const [accessReady, setAccessReady] = useState(false);
  const [publishedState, setPublishedState] = useState<PublishedState | null>(null);
  const loadSeqRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [shareOpen, setShareOpen] = useState(false);
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
    if (!binding.noteId) {
      setAccessReady(true);
      return;
    }
    const seq = ++loadSeqRef.current;
    setError(null);
    const [membersRes] = await Promise.all([
      listNoteCookieMembers(binding.noteId),
      loadPublishStatus(),
      loadActivity(),
    ]);
    if (seq !== loadSeqRef.current) return;
    if (!membersRes.ok) {
      setMembers([]);
      if (binding.accessRole !== "member") setError(membersRes.error);
    } else {
      setMembers(membersRes.members);
    }
    setAccessReady(true);
  }, [binding.accessRole, binding.noteId, loadActivity, loadPublishStatus]);

  useEffect(() => {
    setAccessReady(false);
    setMembers([]);
    setPublishedState(null);
    setLoadByUserId({});
    setLoadByEmail({});
    setSyncByUserId({});
    setSyncByEmail({});
  }, [binding.noteId]);

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
      .subscribe();

    return () => {
      window.removeEventListener("p0020-cookie-route-shared", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(poll);
      if (activityChannel) void supabase.removeChannel(activityChannel);
    };
  }, [binding.domain, binding.noteId, loadActivity]);

  const routeStatusReady = publishedState !== null;
  const routePublished = publishedState?.published === true;
  const ownerUserId = binding.ownerUserId ?? null;
  const ownerEmail = (binding.ownerUserEmail ?? "").trim().toLowerCase();
  const publishedLabel = !routeStatusReady ? "—" : routePublished ? "Published" : "Missing";

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

  const accessFilters = useMemo(
    () => accessFiltersWithCounts(accessRows, query, filterValues, routePublished),
    [accessRows, filterValues, query, routePublished],
  );

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
    setShareOpen(false);
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

  const openShareModal = useCallback(() => {
    setShareEmail("");
    setShareAccess("load");
    setShareOpen(true);
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

      {shareOpen && canShare ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_SHARE_TOC}
          idPrefix="rt-m-share-"
          title="Share"
          onClose={() => setShareOpen(false)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Share"
              primaryIcon={UserPlus}
              primaryBusy={shareBusy}
              primaryDisabled={!shareEmail.trim()}
              onPrimary={() => void submitShare()}
              onSecondary={() => setShareOpen(false)}
            />
          }
        >
          <CookieRouteModalSection
            id="rt-m-share-route"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_SHARE_TOC, "route")}
          >
            <div className="cookie-route-modal__route-card">
              <div className="min-w-0">
                <p className="cookie-route-modal__route-card-title">{binding.noteTitle ?? "Cookie route"}</p>
                <p className="cookie-route-modal__route-card-meta">{binding.noteId}</p>
              </div>
              <button
                type="button"
                className="cookie-route-modal__copy-btn"
                onClick={() => void navigator.clipboard?.writeText(binding.noteId)}
              >
                Copy Note ID
              </button>
            </div>
          </CookieRouteModalSection>
          <CookieRouteModalSection
            id="rt-m-share-grant"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_SHARE_TOC, "grant")}
          >
            <p className="cookie-route-modal__note">
              Grant Load or Sync access by email. Manage stays with route owner only.
            </p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block min-w-0">
                <CookieRouteFieldLabel icon={Mail}>User email</CookieRouteFieldLabel>
                <input
                  className="field auth-gate-field w-full"
                  value={shareEmail}
                  placeholder="user@example.com"
                  onChange={(event) => setShareEmail(event.target.value)}
                />
              </label>
              <label className="block min-w-0">
                <CookieRouteFieldLabel icon={Shield}>Access</CookieRouteFieldLabel>
                <HubSingleFilterDropdown
                  filterKey="access"
                  label="Access"
                  value={shareAccess}
                  options={COOKIE_ACCESS_SELECT_OPTIONS}
                  onChange={(v) => setShareAccess(v as ShareAccess)}
                  className="w-full"
                />
              </label>
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

      {editingMember ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_EDIT_MEMBER_TOC}
          idPrefix="rt-m-edit-"
          title="Edit access"
          onClose={() => setEditingMember(null)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Save"
              primaryIcon={Save}
              primaryBusy={editBusy}
              onPrimary={() => void saveEdit()}
              onSecondary={() => setEditingMember(null)}
            />
          }
        >
          <CookieRouteModalSection
            id="rt-m-edit-member"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_EDIT_MEMBER_TOC, "member")}
          >
            <p className="cookie-route-modal__note">Update Load or Sync access for this member.</p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                <HubSingleFilterDropdown
                  filterKey="access"
                  label="Access"
                  value={editAccess}
                  options={COOKIE_ACCESS_SELECT_OPTIONS}
                  onChange={(v) => setEditAccess(v as ShareAccess)}
                  className="w-full"
                />
              </label>
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

      <div className="mb-3">
        <FilterBar
          layout="inline"
          placeholder="Search access by user, role, route..."
          filters={accessFilters}
          query={query}
          onQueryChange={setQuery}
          values={filterValues}
          onValuesChange={setFilterValues}
          trailing={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-[10px] text-[var(--muted)] tabular-nums">
                {accessReady ? `${filteredAccessRows.length}/${accessRows.length}` : "Loading…"}
              </span>
              {canShare ? (
                <CookieRouteAccessBulkActionBar
                  hasSelection={selectedIds.size > 0}
                  selectedCount={selectedIds.size}
                  canManage={canShare}
                  shareBusy={shareBusy || revokeBusy}
                  onAdd={openShareModal}
                  onEdit={openEditBulk}
                  onDelete={() => requestRevoke([...selectedIds])}
                />
              ) : null}
            </div>
          }
        />
      </div>

      {!accessReady ? (
        <CookieRouteAccessTableSkeleton rows={Math.max(3, members.length || 3)} />
      ) : (
        <CookieRouteAccessTable
          rows={filteredAccessRows}
          routePublished={routePublished}
          publishedLabel={publishedLabel}
          routeStatusReady={routeStatusReady}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allVisibleSelected={allVisibleSelected}
          syncAtForRow={syncAtForRow}
          loadAtForRow={loadAtForRow}
        />
      )}

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
