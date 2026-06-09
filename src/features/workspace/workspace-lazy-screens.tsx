import { lazy } from "react";

export const TwofaManagerScreen = lazy(() =>
  import("../twofa/TwofaManagerScreen").then((m) => ({ default: m.TwofaManagerScreen })),
);

export const CookieSyncScreen = lazy(() =>
  import("../cookie/CookieSyncScreen").then((m) => ({ default: m.CookieSyncScreen })),
);

export const SystemDesignTemplateScreen = lazy(() =>
  import("../system/SystemDesignTemplateScreen").then((m) => ({
    default: m.SystemDesignTemplateScreen,
  })),
);
