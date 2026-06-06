import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Cookie, Loader2, type LucideIcon } from "lucide-react";
import { HubModalFrame } from "@tool-workspace/hub-ui";
import { TocSectionNav } from "../overview/TocSectionNav";
import { TocHighlightContent, TocSectionHighlightProvider } from "../overview/toc-section-highlight-context";
import type { OverviewTocItem } from "../overview/overview-toc";

const SCROLL_ROOT = ".cookie-route-form-modal .modal-shell__scroll--user-access";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  wide?: boolean;
  toc?: readonly OverviewTocItem[];
  idPrefix?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function CookieRouteModalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3 rounded-xl border border-white/5 bg-white/[.02] p-3">
      <h3 className="border-b border-white/5 pb-2 text-[15px] font-semibold leading-snug text-[var(--text)]">{title}</h3>
      {children}
    </section>
  );
}

export function CookieRouteFieldLabel({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="cookie-route-field-label">
      {Icon ? <Icon size={12} className="cookie-route-field-label__icon" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function CookieRouteModalActions({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryBusy,
  onSecondary: _onSecondary,
  danger,
  primaryIcon: PrimaryIcon,
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
    <button
      type="button"
      className={`cookie-dl-modal__confirm${danger ? " cookie-route-modal__confirm--danger" : ""}`}
      disabled={primaryDisabled || primaryBusy}
      onClick={onPrimary}
      aria-label={primaryBusy ? "Please wait" : primaryLabel}
    >
      {primaryBusy ? (
        <Loader2 size={16} className="cookie-dl-modal__confirm-icon--busy animate-spin" aria-hidden />
      ) : PrimaryIcon ? (
        <PrimaryIcon size={16} aria-hidden />
      ) : null}
      <span>{primaryBusy ? "Please wait…" : primaryLabel}</span>
    </button>
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
  children,
  footer,
  onClose,
}: Props) {
  const hasToc = Boolean(toc?.length);
  const tocSectionIds = useMemo(
    () => (toc ?? []).map(({ id }) => `${idPrefix}${id}`),
    [idPrefix, toc],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("hub-modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("hub-modal-open");
    };
  }, [onClose]);

  const shellClass = [
    "modal-shell modal-shell--tool-detail cookie-route-form-modal",
    hasToc ? "cookie-route-form-modal--with-toc" : wide ? "cookie-route-form-modal--wide" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="modal-backdrop modal-backdrop--tool-detail" role="presentation" onClick={onClose}>
      <HubModalFrame onClose={onClose}>
        <div
          className={shellClass}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-route-form-title"
        >
          <header className="user-access-modal__header">
            <div className="user-access-modal__header-main min-w-0 flex-1">
              <div className="auth-gate-icon cookie-route-form-modal__icon h-8 w-8 shrink-0 rounded-lg" aria-hidden>
                <Cookie size={18} />
              </div>
              <h2
                id="cookie-route-form-title"
                className="user-access-modal__header-name min-w-0 truncate text-sm font-semibold text-[var(--text)]"
              >
                {title}
              </h2>
            </div>
          </header>

          <div className="modal-shell__scroll modal-shell__scroll--user-access">
            {hasToc ? (
              <TocSectionHighlightProvider sectionIds={tocSectionIds}>
                <div className="grid gap-4 lg:grid-cols-[var(--overview-toc-w)_minmax(0,1fr)]">
                  <aside className="lg:sticky lg:top-0 lg:self-start">
                    <TocSectionNav items={toc!} idPrefix={idPrefix} scrollRootSelector={SCROLL_ROOT} />
                  </aside>
                  <TocHighlightContent className="min-w-0 space-y-4 p-1 sm:p-2">{children}</TocHighlightContent>
                </div>
              </TocSectionHighlightProvider>
            ) : (
              <div className="cookie-route-modal__body min-w-0 space-y-4 p-1 sm:p-2">{children}</div>
            )}
          </div>

          {footer ? (
            <footer className="cookie-dl-modal__footer">
              <div className="cookie-dl-modal__footer-inner">{footer}</div>
            </footer>
          ) : null}
        </div>
      </HubModalFrame>
    </div>,
    document.body,
  );
}
