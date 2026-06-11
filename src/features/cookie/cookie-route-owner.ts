import type { CookieBinding } from "./cookieBridge";

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

/** Route owner display — card meta + table Source column. */
export function resolveCookieRouteOwnerLabel(binding: CookieBinding): string {
  if (binding.accessRole === "member") {
    return binding.ownerUserEmail?.trim() || (binding.ownerUserId ? shortId(binding.ownerUserId) : "Route owner");
  }
  return binding.ownerUserEmail?.trim() || (binding.ownerUserId ? shortId(binding.ownerUserId) : "Current user");
}
