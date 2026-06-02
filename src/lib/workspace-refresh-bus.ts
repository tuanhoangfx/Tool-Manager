export const WORKSPACE_LIST_REFRESHING = "p0020:workspace-list-refreshing";
export const WORKSPACE_REFRESH_REQUEST = "p0020:workspace-refresh-request";

export function publishWorkspaceListRefreshing(refreshing: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_LIST_REFRESHING, { detail: refreshing }));
}

export function requestWorkspaceDataRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_REFRESH_REQUEST));
}
