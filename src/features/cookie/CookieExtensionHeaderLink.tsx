import { Cookie, Download } from "lucide-react";
import {
  EXTENSION_HEADER_LABEL,
  EXTENSION_INSTALL_HINT,
} from "./extensionInstall";
import { useExtensionRelease } from "./useExtensionRelease";
import "./cookie-extension-header-cta.css";

type Props = {
  className?: string;
};

/** Prominent header install CTA — sits next to Cookie settings in AppTabHeader actions. */
export function CookieExtensionHeaderLink({ className = "" }: Props) {
  const release = useExtensionRelease();
  return (
    <a
      href={release.releasePage}
      target="_blank"
      rel="noopener noreferrer"
      className={`cookie-extension-header-cta group ${className}`.trim()}
      title={EXTENSION_INSTALL_HINT}
      aria-label={`${EXTENSION_HEADER_LABEL} v${release.version} — open latest release`}
    >
      <span className="cookie-extension-header-cta__glow" aria-hidden />
      <Cookie size={14} className="cookie-extension-header-cta__icon shrink-0" aria-hidden />
      <span className="cookie-extension-header-cta__label truncate">{EXTENSION_HEADER_LABEL}</span>
      <span className="cookie-extension-header-cta__ver tabular-nums">v{release.version}</span>
      <Download size={12} className="cookie-extension-header-cta__dl shrink-0 opacity-70 transition-opacity group-hover:opacity-100" aria-hidden />
    </a>
  );
}
