/** Status dot on route card avatar — locked browser vs sync state. */
export type RouteStatusDot = {
  color: string;
  title: string;
};

export function resolveRouteStatusDot(opts: {
  sourceLocked: boolean;
  syncStatus?: string | null;
}): RouteStatusDot {
  if (opts.sourceLocked) {
    return {
      color: "#22c55e",
      title: "Locked browser — route bound to extension profile",
    };
  }

  const status = (opts.syncStatus ?? "pending").toLowerCase();
  if (status === "error") {
    return { color: "#ef4444", title: "Last extension sync failed" };
  }
  if (status === "pending" || status === "manual") {
    return { color: "#f59e0b", title: "Awaiting extension sync" };
  }
  return { color: "#818cf8", title: "Extension sync OK" };
}
