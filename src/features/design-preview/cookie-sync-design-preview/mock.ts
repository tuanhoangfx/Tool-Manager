export const COOKIE_SYNC_MOCK = {
  source: {
    browserId: "33101c8f",
    label: "Chrome 0010 · main",
    version: "0.5.36",
    facebookCookies: 10,
  },
  targets: [
    { browserId: "a3c73cac", label: "Chrome Test 0100", state: "read-only", cookies: 10, lastLoad: "23:12" },
    { browserId: "5ad932dc", label: "Laptop profile", state: "stale", cookies: 7, lastLoad: "22:44" },
  ],
  routes: [
    {
      domain: ".facebook.com",
      note: "Cookie Facebook",
      syncId: "TM-4b5ab60a",
      sourceBrowserId: "33101c8f",
      vault: "10 cookies",
      version: "9a72…f41d",
      updated: "23:10",
      status: "Locked source",
    },
    {
      domain: ".zalo.me",
      note: "Zalo account",
      syncId: "TM-b18e2a77",
      sourceBrowserId: "",
      vault: "No vault",
      version: "—",
      updated: "—",
      status: "Choose source",
    },
  ],
  commands: [
    { label: "Set Source", tone: "emerald", desc: "Lock selected browser as publisher" },
    { label: "Apply Latest", tone: "indigo", desc: "Read-only targets pull vault" },
    { label: "Inspect Vault", tone: "cyan", desc: "Cookie names + version metadata" },
    { label: "Reload Ext", tone: "amber", desc: "Refresh extension package" },
  ],
};
