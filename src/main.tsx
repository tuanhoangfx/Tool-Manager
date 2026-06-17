import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initHubUserZoom, mountHubApp } from "@tool-workspace/hub-ui";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { setupHubUi } from "./lib/hub-ui-setup";
/** Pin auth context module before lazy tab chunks (HMR / split graph). */
import "./features/notes/AuthSessionProvider";

initHubUserZoom();
import { isPublicShareEntry, migratePublicShareUrl } from "./features/notes/shareUtils";
import { prefetchDataBoxAuth } from "./lib/prefetch-data-box-auth";
import { prefetchTwofaAuth } from "./lib/prefetch-twofa-auth";
import { registerTabChunkServiceWorker } from "./lib/register-tab-chunk-sw";
import "./theme/hub-boot.css";
import "./theme/p0008-globals.css";
import "./theme/hub-appearance.css";
import "./theme/data-box-layout.css";
import "./styles.css";

setupHubUi();
registerTabChunkServiceWorker();

if (typeof window !== "undefined" && isPublicShareEntry()) {
  migratePublicShareUrl();
} else {
  prefetchDataBoxAuth();
  prefetchTwofaAuth();
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("#root not found");
}

mountHubApp(rootEl, () => {
  createRoot(rootEl).render(
    <StrictMode>
      <AppErrorBoundary label="P0020-Data-Box">
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
});
