let registered = false;

/** Prod-only SW — cache feature-* chunks for faster tab reload. */
export function registerTabChunkServiceWorker(): void {
  if (registered || !import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  registered = true;
  void navigator.serviceWorker.register("/sw-tab-chunks.js").catch(() => {});
}
