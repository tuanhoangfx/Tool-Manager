import { useCallback, useMemo, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useAppToast } from "../../components/toast";
import type { CookieBinding } from "./cookieBridge";
import { CookieRouteMembers } from "./CookieRouteMembers";
import type { CookieVaultRow } from "./useCookieVaultMap";

export type RouteDetailRenderContext = { vault?: CookieVaultRow; noteSyncedAt?: string | null };

export type CookieRouteDetailRenderers = {
  renderAccessDetail: (binding: CookieBinding, ctx?: RouteDetailRenderContext) => ReactNode;
};

/** Access section for Cookie Auto / Notes route detail modal. */
export function useCookieRouteDetailRenderers(
  _session: Session | null,
  opts?: {
    onShared?: () => void;
    onEnsureRoutePublished?: (binding: CookieBinding) => Promise<boolean>;
  },
): CookieRouteDetailRenderers {
  const { pushToast } = useAppToast();
  const onShared = opts?.onShared;
  const onEnsureRoutePublished = opts?.onEnsureRoutePublished;

  const renderAccessDetail = useCallback(
    (binding: CookieBinding, ctx?: RouteDetailRenderContext) => (
      <CookieRouteMembers
        binding={binding}
        vault={ctx?.vault}
        noteSyncedAt={ctx?.noteSyncedAt}
        onToast={(message, tone = "success") => pushToast(message, tone, tone === "error" ? 8000 : undefined)}
        onEnsureRoutePublished={onEnsureRoutePublished ? () => onEnsureRoutePublished(binding) : undefined}
        onShared={() => onShared?.()}
      />
    ),
    [onEnsureRoutePublished, onShared, pushToast],
  );

  return useMemo(() => ({ renderAccessDetail }), [renderAccessDetail]);
}
