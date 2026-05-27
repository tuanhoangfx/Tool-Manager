import { Cookie, Download } from "lucide-react";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import {
  EXTENSION_HEADER_LABEL,
  EXTENSION_INSTALL_HINT,
  EXTENSION_RELEASE_PAGE,
} from "./extensionInstall";
import "./cookie-extension-header-cta.css";

type Props = {
  className?: string;
};

/** Prominent header install CTA — sits next to Cookie settings in AppTabHeader actions. */
export function CookieExtensionHeaderLink({ className = "" }: Props) {
  return (
    <a
      href={EXTENSION_RELEASE_PAGE}
      target="_blank"
      rel="noopener noreferrer"
      className={`cookie-extension-header-cta group ${className}`.trim()}
      title={EXTENSION_INSTALL_HINT}
      aria-label={`${EXTENSION_HEADER_LABEL} v${EXTENSION_BUILD.version} — open latest release`}
    >
      <span className="cookie-extension-header-cta__glow" aria-hidden />
      <Cookie size={14} className="cookie-extension-header-cta__icon shrink-0" aria-hidden />
      <span className="cookie-extension-header-cta__label truncate">{EXTENSION_HEADER_LABEL}</span>
      <span className="cookie-extension-header-cta__ver tabular-nums">v{EXTENSION_BUILD.version}</span>
      <Download size={12} className="cookie-extension-header-cta__dl shrink-0 opacity-70 transition-opacity group-hover:opacity-100" aria-hidden />
    </a>
  );
}
