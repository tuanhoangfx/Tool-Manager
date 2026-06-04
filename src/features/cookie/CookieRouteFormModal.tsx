import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Cookie, Loader2, X, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

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
  secondaryLabel = "Cancel",
  onSecondary,
  danger,
  secondaryIcon: SecondaryIcon = X,
  primaryIcon: PrimaryIcon,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryBusy?: boolean;
  secondaryLabel?: string;
  onSecondary: () => void;
  danger?: boolean;
  secondaryIcon?: LucideIcon;
  primaryIcon?: LucideIcon;
}) {
  return (
    <div className="auth-gate-actions cookie-route-modal__actions">
      <button
        type="button"
        className="auth-gate-secondary cookie-route-modal__btn"
        onClick={onSecondary}
        disabled={primaryBusy}
      >
        <SecondaryIcon size={14} aria-hidden />
        {secondaryLabel}
      </button>
      <button
        type="button"
        className={`auth-gate-submit cookie-route-modal__btn${danger ? " cookie-route-modal__submit--danger" : ""}`}
        disabled={primaryDisabled || primaryBusy}
        onClick={onPrimary}
      >
        {primaryBusy ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : PrimaryIcon ? (
          <PrimaryIcon size={14} aria-hidden />
        ) : null}
        {primaryBusy ? "Please wait…" : primaryLabel}
      </button>
    </div>
  );
}

/** Add / Share / Edit route — P0004 auth-gate shell (dark Hub theme). */
export function CookieRouteFormModal({
  title,
  subtitle,
  eyebrow = "Cookie route",
  wide = false,
  children,
  footer,
  onClose,
}: Props) {
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

  return createPortal(
    <div className="auth-gate-root cookie-route-form-root" role="presentation">
      <div className="auth-gate-backdrop" aria-hidden onClick={onClose} />
      <div
        className={`auth-gate-modal cookie-route-form-modal${wide ? " auth-gate-modal--cookie-route-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-route-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-gate-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="cookie-route-form-modal__head">
          <div className="auth-gate-icon cookie-route-form-modal__icon" aria-hidden>
            <Cookie size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="cookie-route-form-modal__eyebrow">{eyebrow}</p>
            <h2 id="cookie-route-form-title" className="cookie-route-form-modal__title">
              {title}
            </h2>
            {subtitle ? <p className="cookie-route-form-modal__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        <div className="cookie-route-modal__body">{children}</div>
        {footer ? <div className="cookie-route-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
