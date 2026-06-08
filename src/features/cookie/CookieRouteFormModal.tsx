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
import type { OverviewTocItem } from "../overview/overview-toc";

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

export {
  HubToolDetailSection as CookieRouteModalSection,
  HubFormFieldLabel as CookieRouteFieldLabel,
} from "@tool-workspace/hub-ui";

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

/** Add / Share / Edit / Delete route — golden HubToolDetailModal shell (User access / tool detail size). */
export function CookieRouteFormModal({
  title,
  subtitle: _subtitle,
  eyebrow: _eyebrow = "Cookie route",
  wide: _wide = false,
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
  const sectionIds = useMemo(
    () => (toc ?? []).map(({ id }) => `${idPrefix}${id}`),
    [idPrefix, toc],
  );

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={title}
      headerIcon={headerIcon}
      headerIconClassName={headerIconClassName}
      shellClassName={`cookie-route-form-modal${hasToc ? "" : " hub-tool-detail-modal--fit"}`}
      size={hasToc ? "detail" : "compact"}
      sectionIds={hasToc ? sectionIds : undefined}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      footer={footer}
      toc={
        hasToc ? (
          <TocSectionNav items={toc!} idPrefix={idPrefix} scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT} />
        ) : undefined
      }
    >
      <div className={`cookie-route-modal__body min-w-0 ${HUB_TOOL_DETAIL_SECTIONS_CLASS}`}>{children}</div>
    </HubToolDetailModal>
  );
}

export { HUB_TOOL_DETAIL_SCROLL_ROOT as COOKIE_TOOL_DETAIL_SCROLL_ROOT };
