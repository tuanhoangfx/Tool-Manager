import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { hideBootLoader } from "./lib/hide-boot-loader";
import { isPublicShareEntry, migratePublicShareUrl } from "./features/notes/shareUtils";
import { prefetchDataBoxAuth } from "./lib/prefetch-data-box-auth";
import "./theme/hub-boot.css";
import "./theme/p0008-globals.css";
import "./theme/hub-appearance.css";
import "./theme/data-box-layout.css";
import "./styles.css";

if (typeof window !== "undefined" && isPublicShareEntry()) {
  migratePublicShareUrl();
} else {
  prefetchDataBoxAuth();
}
hideBootLoader();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("#root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <AppErrorBoundary label="P0020-Data-Box">
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

requestAnimationFrame(() => {
  hideBootLoader();
});
