import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Globe2 } from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailIdentityHeader,
  HubToolDetailSection,
  MetaChip,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
} from "@tool-workspace/hub-ui";
import { TocSectionNav } from "../overview/TocSectionNav";
import { COOKIE_ROUTE_DETAIL_TOC, cookieRouteDetailSectionTitle } from "./cookie-route-detail-toc";
import type { CookieAutoRow } from "./cookieAutoRow";
import { CookieRouteAboutSummary } from "./CookieRouteAboutSummary";
import { CookieAccessRoleBadge } from "./CookieAccessRoleBadge";
import type { CookieBinding } from "./cookieBridge";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import type { CookieVaultRow } from "./useCookieVaultMap";

export type CookieRouteDetailModalProps = {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  renderDetail?: (binding: CookieBinding) => ReactNode;
  renderAccessDetail?: (
    binding: CookieBinding,
    ctx?: { vault?: CookieVaultRow; noteSyncedAt?: string | null },
  ) => ReactNode;
  onClose: () => void;
};

export function CookieRouteDetailModal({
  row,
  vault,
  renderDetail,
  renderAccessDetail,
  onClose,
}: CookieRouteDetailModalProps) {
  const { binding, note } = row;
  const idPrefix = `cookie-route-${binding.id}-`;
  const sectionItems = useMemo(
    () => COOKIE_ROUTE_DETAIL_TOC.map(({ id }) => `${idPrefix}${id}`),
    [idPrefix],
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const routeTitle = binding.noteTitle ?? note?.title ?? "Cookie route";
  const routeSite = resolveCookieSiteIcon(binding.domain);

  const copyValue = useCallback(async (field: string, value: string | null | undefined) => {
    const text = value?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1400);
    } catch {
      // Clipboard can be unavailable in some embedded browser contexts.
    }
  }, []);

  const titleId = `cookie-route-${binding.id}`;

  return (
    <HubToolDetailModal
      open
      onClose={onClose}
      ariaLabelledBy={titleId}
      header={
        <HubToolDetailIdentityHeader
          titleId={titleId}
          title={routeTitle}
          leading={
            routeSite ? (
              <img
                src={routeSite.src}
                alt=""
                width={32}
                height={32}
                className="user-access-modal__avatar h-8 w-8 shrink-0 rounded-lg object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="user-access-modal__avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/20"
                aria-hidden
              >
                <Globe2 size={18} className="text-indigo-200" />
              </span>
            )
          }
          trailing={
            <>
              <CookieAccessRoleBadge role={binding.accessRole ?? "member"} />
              <MetaChip icon={<Globe2 size={11} />} label={binding.domain} tone="cyan" title="Route domain" />
            </>
          }
        />
      }
      toc={
        <TocSectionNav
          items={COOKIE_ROUTE_DETAIL_TOC}
          idPrefix={idPrefix}
          scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
        />
      }
      sectionIds={sectionItems}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
    >
      <div className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>
        <HubToolDetailSection
          id={`${idPrefix}about`}
          title={cookieRouteDetailSectionTitle("about")}
        >
          <CookieRouteAboutSummary
            binding={binding}
            vault={vault}
            noteSyncedAt={note?.synced_at ?? null}
            syncStatus={note?.sync_status ?? "pending"}
            copiedField={copiedField}
            onCopy={copyValue}
          />
        </HubToolDetailSection>

        <HubToolDetailSection
          id={`${idPrefix}access`}
          title={cookieRouteDetailSectionTitle("access")}
        >
          {renderAccessDetail
            ? renderAccessDetail(binding, { vault, noteSyncedAt: note?.synced_at ?? null })
            : renderDetail
              ? renderDetail(binding)
              : <p className="text-[12px] text-[var(--muted)]">No access detail.</p>}
        </HubToolDetailSection>
      </div>
    </HubToolDetailModal>
  );
}
