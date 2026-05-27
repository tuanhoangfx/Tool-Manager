import type { ReactNode } from "react";
import { CookieExtensionGuideButton } from "./CookieExtensionGuideButton";
import { CookieExtensionHeaderLink } from "./CookieExtensionHeaderLink";

/** Header actions for Cookie Auto: download CTA, guide, optional settings gear. */
export function CookieInstallHeaderActions({ trailing }: { trailing?: ReactNode }) {
  return (
    <>
      <CookieExtensionHeaderLink />
      <CookieExtensionGuideButton />
      {trailing}
    </>
  );
}
