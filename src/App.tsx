import { ToastContainer, ToastProvider } from "./components/toast";
import { PublicShareScreen } from "./features/notes/PublicShareScreen";
import { isPublicShareEntry, migratePublicShareUrl } from "./features/notes/shareUtils";
import { WorkspaceApp } from "./features/workspace/WorkspaceApp";

/** Public share — no account, no Notes tab, no AuthSessionProvider. */
function PublicShareApp() {
  migratePublicShareUrl();
  return (
    <ToastProvider>
      <PublicShareScreen />
      <ToastContainer />
    </ToastProvider>
  );
}

/** P0020-Data-Box — data shell tabs: Notes · 2FA · Cookie Auto · System */
export default function App() {
  if (typeof window !== "undefined" && isPublicShareEntry()) {
    return <PublicShareApp />;
  }
  return <WorkspaceApp />;
}
