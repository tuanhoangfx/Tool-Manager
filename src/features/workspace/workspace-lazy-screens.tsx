import { lazy } from "react";

export const TodoScreen = lazy(() =>
  import("../todo/TodoScreen").then((m) => ({ default: m.TodoScreen })),
);

export const TwofaManagerScreen = lazy(() =>
  import("../twofa/TwofaManagerScreen").then((m) => ({ default: m.TwofaManagerScreen })),
);

export const CookieSyncScreen = lazy(() =>
  import("../cookie/CookieSyncScreen").then((m) => ({ default: m.CookieSyncScreen })),
);

export const SheetWorkspaceScreen = lazy(() =>
  import("../sheet/SheetWorkspaceScreen").then((m) => ({ default: m.SheetWorkspaceScreen })),
);

export const SystemDesignTemplateScreen = lazy(() =>
  import("../system/SystemDesignTemplateScreen").then((m) => ({
    default: m.SystemDesignTemplateScreen,
  })),
);
