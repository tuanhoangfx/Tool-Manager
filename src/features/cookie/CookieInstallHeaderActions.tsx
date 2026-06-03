import type { ReactNode } from "react";
import { CookieExtensionHeaderLink } from "./CookieExtensionHeaderLink";

/** Header actions for Cookie Auto: release link + optional trailing controls. */
export function CookieInstallHeaderActions({ trailing }: { trailing?: ReactNode }) {
  return (
    <>
      <CookieExtensionHeaderLink />
      {trailing}
    </>
  );
}
