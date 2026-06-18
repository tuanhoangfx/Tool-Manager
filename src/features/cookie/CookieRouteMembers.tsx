import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Mail, Pencil, Save, Shield, UserPlus, Users } from "lucide-react";
import { HubResultCount, type FilterValues } from "../../components/sales-shell";
import {
  HubModalFilterField,
  HubFormFieldLabel,
  HubModalDirectoryEmptyFiltered,
  HubModalDirectoryFilterBar,
  HubModalDirectorySection,
  HUB_TOOL_DETAIL_FORM_GRID_2_CLASS,
} from "@tool-workspace/hub-ui";
import { accessFiltersWithCounts, filterAccessRows } from "./access-filter-counts";
import { ToolConfirmDialog } from "../../components/confirm/ToolConfirmDialog";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { useNotesAuth } from "../notes/AuthSessionProvider";
import type { CookieBinding } from "./cookieBridge";
import {
  revokeNoteCookieMember,
  upsertNoteCookieMember,
  type NoteCookieMemberRow,
} from "./noteCookieMembersRepository";
import { getOfflineMode } from "../../lib/offlineMode";
import { supabase } from "../../lib/supabase";
import { listCookieRouteActivityCached, invalidateCookieRouteActivity } from "./cookieRouteActivityCache";
import { getCookieRoutePublishStatus } from "./cookieRoutesRepository";
import {
  fetchNoteCookieMembers,
  getCachedNoteCookieMembers,
  invalidateNoteCookieMembersCache,
} from "./cookieRouteMembersPrefetch";
import { displayGranteeUser, formatGranteeSharePreview } from "./grantee-display";
import { cookieRouteDomainKey } from "./cookieRouteDomain";
import { CookieRouteAccessBulkActionBar } from "./CookieRouteAccessBulkActionBar";
import { CookieRouteAccessTable, type RouteAccessRow } from "./CookieRouteAccessTable";
import {
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
  /** Publish owner route to cookie_bridge_routes so grantees can pull it. */
  onEnsureRoutePublished?: () => Promise<boolean>;
  onShared?: () => void;
};

type ShareAccess = "load" | "sync";

function memberUser(member: NoteCookieMemberRow) {
  return displayGranteeUser(member);
}

function memberAccessRole(member: NoteCookieMemberRow) {
  return member.can_publish ? "Sync" : "Load";
}

function shareAccessFromMember(member: NoteCookieMemberRow): ShareAccess {
  return member.can_publish ? "sync" : "load";
}

function sharePermissions(access: ShareAccess) {
  return {
    canApply: true,
    canPublish: access === "sync",
    canManage: false,
  };
}

export function CookieRouteMembers({
  binding,
  noteSyncedAt,
  onToast,
  onEnsureRoutePublished,
  onShared,
}: Props) {
  const { session } = useNotesAuth();
  const [members, setMembers] = useState<NoteCookieMemberRow[]>(() => {
    const hit = getCachedNoteCookieMembers(binding.noteId);
    return hit?.ok ? hit.members : [];
  });
  const [membersLoading, setMembersLoading] = useState(false);
  const [cloudPublished, setCloudPublished] = useState<boolean | null>(null);
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

  const loadActivity = useCallback(async () => {
    if (!binding.noteId?.trim() || !binding.domain?.trim()) {
      setLoadByUserId({});
      setLoadByEmail({});
      setSyncByUserId({});
      setSyncByEmail({});
      return;
    }
    const res = await listCookieRouteActivityCached(binding.noteId, cookieRouteDomainKey(binding.domain));
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

  const load = useCallback(async (opts?: { force?: boolean }) => {
    if (!binding.noteId) return;
    const seq = ++loadSeqRef.current;
    setMembersLoading(true);
    setError(null);
    try {
      const membersPromise = fetchNoteCookieMembers(
        binding.noteId,
        opts?.force ? { refresh: true } : undefined,
      );
      const publishPromise =
        canShare && session?.user?.id
          ? getCookieRoutePublishStatus(session, binding)
          : Promise.resolve(null);
      const activityPromise =
        binding.noteId?.trim() && binding.domain?.trim()
          ? listCookieRouteActivityCached(binding.noteId, cookieRouteDomainKey(binding.domain))
          : Promise.resolve({ ok: false as const, error: "missing_route" });

      const [membersRes, publishRes, activityRes] = await Promise.all([
        membersPromise,
        publishPromise,
        activityPromise,
      ]);

      if (seq !== loadSeqRef.current) return;

      if (!membersRes.ok) {
        setMembers([]);
        if (binding.accessRole !== "member" && !getOfflineMode()) setError(membersRes.error);
      } else {
        setMembers(membersRes.members);
      }

      if (canShare && session?.user?.id) {
        setCloudPublished(publishRes && publishRes.ok ? publishRes.published : false);
      }

      if (activityRes.ok) {
        const nextLoadId: Record<string, string> = {};
        const nextLoadEmail: Record<string, string> = {};
        const nextSyncId: Record<string, string> = {};
        const nextSyncEmail: Record<string, string> = {};
        for (const row of activityRes.activities) {
          if (row.user_id && row.last_load_at) nextLoadId[row.user_id] = row.last_load_at;
          if (row.user_email && row.last_load_at) nextLoadEmail[row.user_email] = row.last_load_at;
          if (row.user_id && row.last_sync_at) nextSyncId[row.user_id] = row.last_sync_at;
          if (row.user_email && row.last_sync_at) nextSyncEmail[row.user_email] = row.last_sync_at;
        }
        setLoadByUserId(nextLoadId);
        setLoadByEmail(nextLoadEmail);
        setSyncByUserId(nextSyncId);
        setSyncByEmail(nextSyncEmail);
      } else {
        setLoadByUserId({});
        setLoadByEmail({});
        setSyncByUserId({});
        setSyncByEmail({});
      }
    } finally {
      if (seq === loadSeqRef.current) setMembersLoading(false);
    }
  }, [binding.accessRole, binding.domain, binding.noteId, canShare, session]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const hit = getCachedNoteCookieMembers(binding.noteId);
    setMembers(hit?.members ?? []);
    setLoadByUserId({});
    setLoadByEmail({});
    setSyncByUserId({});
    setSyncByEmail({});
    void loadRef.current();
  }, [binding.noteId]);

  const shareBlocked = cloudPublished === false;
  const granteePreview = useMemo(() => formatGranteeSharePreview(shareEmail), [shareEmail]);

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

  const ownerUserId = binding.ownerUserId ?? null;
  const ownerEmail = (binding.ownerUserEmail ?? "").trim().toLowerCase();

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
        addedAt: null,
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
        addedAt: member.created_at,
        expiresAt: member.expires_at,
        member,
        selectable: true,
      })),
    ],
    [members, ownerLabel],
  );

  const filteredAccessRows = useMemo(
    () => filterAccessRows(accessRows, query, filterValues),
    [accessRows, filterValues, query],
  );

  const accessFilters = useMemo(
    () => accessFiltersWithCounts(accessRows, query, filterValues),
    [accessRows, filterValues, query],
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
    const granteeEmail = res.member.grantee_email ?? shareEmail.trim();
    const published = onEnsureRoutePublished ? await onEnsureRoutePublished() : true;
    setShareEmail("");
    setShareAccess("load");
    setShareOpen(false);
    invalidateCookieRouteActivity(binding.noteId, binding.domain);
    invalidateNoteCookieMembersCache(binding.noteId);
    if (!published) {
      setError("Member saved but route is not published to cloud.");
      setCloudPublished(false);
      onToast?.(
        `Added ${displayGranteeUser(res.member)}, but cloud publish failed — recipient cannot load until the route is saved to cloud.`,
        "warn",
      );
    } else {
      setCloudPublished(true);
    }
    if (published && !res.member.grantee_user_id) {
      onToast?.(
        `Shared with ${displayGranteeUser(res.member)}. Recipient must sign in with that Hub account, then Refresh routes.`,
        "success",
      );
    } else if (published) {
      onToast?.(`Shared with ${displayGranteeUser(res.member)}. Recipient can refresh routes immediately.`, "success");
    }
    await load({ force: true });
    window.dispatchEvent(new CustomEvent("p0020-cookie-route-shared", { detail: { noteId: binding.noteId } }));
    onShared?.();
  }, [
    binding.domain,
    binding.noteId,
    load,
    onEnsureRoutePublished,
    onShared,
    onToast,
    shareAccess,
    shareBusy,
    shareEmail,
  ]);

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
    invalidateCookieRouteActivity(binding.noteId, binding.domain);
    invalidateNoteCookieMembersCache(binding.noteId);
    onToast?.("Access updated.", "success");
    await load({ force: true });
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
    invalidateCookieRouteActivity(binding.noteId, binding.domain);
    invalidateNoteCookieMembersCache(binding.noteId);
    onToast?.(`Revoked access for ${ok} member(s).`, "success");
    await load({ force: true });
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
    if (shareBlocked) {
      onToast?.("Route is not published to cloud yet — save the route first, then share.", "warn");
      return;
    }
    setShareEmail("");
    setShareAccess("load");
    setShareOpen(true);
  }, [onToast, shareBlocked]);

  return (
    <>
      <HubModalDirectorySection
        error={
          error ? (
            <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
              {error}
            </p>
          ) : undefined
        }
        filterBar={
          <HubModalDirectoryFilterBar
            shortcutScope={`cookie-route-access-${binding.id}`}
            placeholder="Search access by user, role…"
            filters={accessFilters}
            query={query}
            onQueryChange={setQuery}
            values={filterValues}
            onValuesChange={setFilterValues}
            toolbar={
              <>
                {membersLoading ? (
                  <span className="hidden text-[10px] text-[var(--muted)] sm:inline">Refreshing…</span>
                ) : null}
                <HubResultCount
                  icon={Users}
                  shown={filteredAccessRows.length}
                  total={accessRows.length}
                  label="members"
                />
              </>
            }
            row2Actions={
              canShare ? (
                <CookieRouteAccessBulkActionBar
                  hasSelection={selectedIds.size > 0}
                  selectedCount={selectedIds.size}
                  canManage={canShare && !shareBlocked}
                  shareBusy={shareBusy || revokeBusy}
                  onAdd={openShareModal}
                  onEdit={openEditBulk}
                  onDelete={() => requestRevoke([...selectedIds])}
                />
              ) : null
            }
          />
        }
        emptyFiltered={
          !membersLoading && filteredAccessRows.length === 0 ? (
            <HubModalDirectoryEmptyFiltered>
              No members match search or filters.
            </HubModalDirectoryEmptyFiltered>
          ) : undefined
        }
        table={
          filteredAccessRows.length > 0 ? (
          <CookieRouteAccessTable
            rows={filteredAccessRows}
            resetKey={`${query}|${JSON.stringify(filterValues)}|${membersLoading ? "load" : "ready"}`}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            allVisibleSelected={allVisibleSelected}
            syncAtForRow={syncAtForRow}
            loadAtForRow={loadAtForRow}
          />
          ) : undefined
        }
      />

      {shareOpen && canShare ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_SHARE_TOC}
          idPrefix="rt-m-share-"
          title="Add user"
          headerIcon={UserPlus}
          onClose={() => setShareOpen(false)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Share"
              primaryIcon={UserPlus}
              primaryBusy={shareBusy}
              primaryDisabled={!shareEmail.trim() || shareBlocked}
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
              Enter Hub User ID (e.g. CS00642) or email — User ID is converted to the workspace auth email
              automatically. Manage stays with route owner only.
            </p>
            {shareBlocked ? (
              <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
                Route is not published to cloud. Save the route from the directory first.
              </p>
            ) : null}
            <div className={HUB_TOOL_DETAIL_FORM_GRID_2_CLASS}>
              <label className="block min-w-0">
                <HubFormFieldLabel icon={Mail}>User ID or email</HubFormFieldLabel>
                <input
                  className="field auth-gate-field w-full"
                  value={shareEmail}
                  placeholder="CS00642 or user@example.com"
                  onChange={(event) => setShareEmail(event.target.value)}
                />
                {granteePreview ? (
                  <p className="mt-1 text-[10px] text-indigo-200/80">{granteePreview}</p>
                ) : null}
              </label>
              <HubModalFilterField
                filterKey="access"
                label="Access"
                icon={Shield}
                value={shareAccess}
                options={COOKIE_ACCESS_SELECT_OPTIONS}
                onChange={(v) => setShareAccess(v as ShareAccess)}
              />
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

      {editingMember ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_EDIT_MEMBER_TOC}
          idPrefix="rt-m-edit-"
          title="Edit access"
          headerIcon={Pencil}
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
            <div className={HUB_TOOL_DETAIL_FORM_GRID_2_CLASS}>
              <label className="block min-w-0">
                <HubFormFieldLabel icon={Mail}>User email</HubFormFieldLabel>
                <input
                  className="field auth-gate-field w-full opacity-80"
                  value={editingMember.grantee_email ?? ""}
                  readOnly
                />
              </label>
              <HubModalFilterField
                filterKey="access"
                label="Access"
                icon={Shield}
                value={editAccess}
                options={COOKIE_ACCESS_SELECT_OPTIONS}
                onChange={(v) => setEditAccess(v as ShareAccess)}
              />
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

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
    </>
  );
}
