import type { WorkspaceNavScreen } from "./workspace-screen";

/** Golden tab-load contract — AI onboard checklist for P0020 workspace tabs. */
export type TabLoadLayer = "chunk" | "data" | "tabActive" | "virtual";

export type TabLoadContractEntry = {
  tab: WorkspaceNavScreen;
  eager: boolean;
  lazyChunk: boolean;
  chunkPrefetch: "boot" | "session" | "hover" | "none";
  dataWarmers: readonly string[];
  tabActiveHooks: readonly string[];
  sharedCode: readonly string[];
  virtualWindow: boolean;
};

export const WORKSPACE_TAB_LOAD_CONTRACT: readonly TabLoadContractEntry[] = [
  {
    tab: "notes",
    eager: true,
    lazyChunk: false,
    chunkPrefetch: "none",
    dataWarmers: ["prefetchNotesListBackground", "prefetchNoteDetailBatch", "prefetchNoteDetail (hover/scroll)"],
    tabActiveHooks: ["NotesWorkspaceScreen", "pickNote", "version interval", "debounced autosave", "shortcuts"],
    sharedCode: ["createClientCache", "createKeyedClientCache", "useVirtualWindow"],
    virtualWindow: true,
  },
  {
    tab: "todo",
    eager: false,
    lazyChunk: true,
    chunkPrefetch: "boot+session",
    dataWarmers: ["prefetchTodoBootBackground", "prefetchTodoTasksBackground"],
    tabActiveHooks: ["TodoAppCore", "useRealtime", "useProfileAndUsers", "useProjects", "useNotifications"],
    sharedCode: ["createClientCache (createTodoQueryCache)", "userTasksQuery"],
    virtualWindow: false,
  },
  {
    tab: "twofa",
    eager: false,
    lazyChunk: true,
    chunkPrefetch: "boot+session",
    dataWarmers: ["prefetchTwofaVaultBackground", "prefetchTwofaAuth (main)"],
    tabActiveHooks: ["useTwofaAccounts", "analyticsActive", "TwofaTotpTickProvider", "useTwofaRealtime"],
    sharedCode: ["useCrossTabVaultReload", "useVirtualWindow", "createKeyedClientCache (detail N/A)"],
    virtualWindow: true,
  },
  {
    tab: "cookie",
    eager: false,
    lazyChunk: true,
    chunkPrefetch: "boot+session",
    dataWarmers: ["prefetchCookieBootBackground", "cookieRouteMembersPrefetch"],
    tabActiveHooks: [
      "useNotesCookieRealtime",
      "useNotes (enabled)",
      "useCookieVaultMap (enabled)",
      "refreshCloudRoutes",
      "useCookieSchemaHealth",
    ],
    sharedCode: ["createClientCache (schema)", "useCrossTabVaultReload (bindings)", "useVirtualWindow"],
    virtualWindow: true,
  },
  {
    tab: "system",
    eager: false,
    lazyChunk: true,
    chunkPrefetch: "session",
    dataWarmers: [],
    tabActiveHooks: [],
    sharedCode: [],
    virtualWindow: false,
  },
] as const;

export function tabLoadContract(tab: WorkspaceNavScreen): TabLoadContractEntry | undefined {
  return WORKSPACE_TAB_LOAD_CONTRACT.find((entry) => entry.tab === tab);
}
