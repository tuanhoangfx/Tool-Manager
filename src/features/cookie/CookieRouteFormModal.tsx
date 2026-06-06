import { useMemo, type ReactNode } from "react";
import { Cookie, type LucideIcon } from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailSection,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
} from "@tool-workspace/hub-ui";
import { TocSectionNav } from "../overview/TocSectionNav";
import { TocHighlightContent, TocSectionHighlightProvider } from "../overview/toc-section-highlight-context";
import type { OverviewTocItem } from "../overview/overview-toc";

export const COOKIE_ROUTE_FORM_SCROLL_ROOT = ".cookie-route-form-modal .hub-tool-detail-modal__scroll";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  wide?: boolean;
  toc?: readonly OverviewTocItem[];
  idPrefix?: string;
  headerIcon?: LucideIcon;
  headerIconClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open?: boolean;
};

export { HubToolDetailSection as CookieRouteModalSection, HubFormFieldLabel as CookieRouteFieldLabel } from "@tool-workspace/hub-ui";

export function CookieRouteModalActions({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryBusy,
  onSecondary: _onSecondary,
  danger,
  primaryIcon,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryBusy?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  danger?: boolean;
  secondaryIcon?: LucideIcon;
  primaryIcon?: LucideIcon;
}) {
  return (
    <HubToolDetailModalPrimaryAction
      label={primaryLabel}
      onClick={onPrimary}
      disabled={primaryDisabled}
      busy={primaryBusy}
      danger={danger}
      icon={primaryIcon}
    />
  );
}

/** Add / Share / Edit route — same shell as Cookie extension download modal. */
export function CookieRouteFormModal({
  title,
  subtitle: _subtitle,
  eyebrow: _eyebrow = "Cookie route",
  wide = false,
  toc,
  idPrefix = "rt-",
  headerIcon = Cookie,
  headerIconClassName,
  children,
  footer,
  onClose,
  open = true,
}: Props) {
  const hasToc = Boolean(toc?.length);
  const tocSectionIds = useMemo(
    () => (toc ?? []).map(({ id }) => `${idPrefix}${id}`),
    [idPrefix, toc],
  );

  const shellClassName = [
    "cookie-route-form-modal",
    hasToc ? "cookie-route-form-modal--with-toc" : wide ? "cookie-route-form-modal--wide" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      headerIcon={headerIcon}
      headerIconClassName={headerIconClassName}
      shellClassName={shellClassName}
      footer={footer}
      toc={
        hasToc ? (
          <TocSectionNav items={toc!} idPrefix={idPrefix} scrollRootSelector={COOKIE_ROUTE_FORM_SCROLL_ROOT} />
        ) : undefined
      }
    >
      {hasToc ? (
        <TocSectionHighlightProvider sectionIds={tocSectionIds}>
          <TocHighlightContent className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>{children}</TocHighlightContent>
        </TocSectionHighlightProvider>
      ) : (
        <div className={`cookie-route-modal__body min-w-0 ${HUB_TOOL_DETAIL_SECTIONS_CLASS}`}>{children}</div>
      )}
    </HubToolDetailModal>
  );
}

export { HUB_TOOL_DETAIL_SCROLL_ROOT as COOKIE_TOOL_DETAIL_SCROLL_ROOT };
