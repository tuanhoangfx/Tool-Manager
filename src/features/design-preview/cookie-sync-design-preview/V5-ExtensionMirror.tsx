import { Cookie, DownloadCloud, LockKeyhole, Sparkles } from "lucide-react";
import { COOKIE_SYNC_MOCK as MOCK } from "./mock";

export function V5ExtensionMirror() {
  return (
    <div className="cookie-dp v5">
      <div className="dp-extension-shell">
        <div className="dp-extension-top">
          <Cookie size={20} />
          <div>
            <strong>E0001 Cookie Bridge</strong>
            <span>ext {MOCK.source.version}</span>
          </div>
          <span className="dp-pill ok">Linked</span>
        </div>
        <div className="dp-extension-status">
          <div>
            <small>Role</small>
            <strong>Read-only target</strong>
          </div>
          <div>
            <small>Source</small>
            <strong>{MOCK.source.browserId}</strong>
          </div>
        </div>
        <div className="dp-extension-route">
          <LockKeyhole size={15} />
          <div>
            <strong>.facebook.com</strong>
            <span>Vault 10 cookies · version 9a72…f41d</span>
          </div>
        </div>
        <button className="dp-extension-primary"><DownloadCloud size={15} /> Load cookies</button>
        <button className="dp-extension-muted" disabled><Sparkles size={15} /> Sync disabled on target</button>
      </div>
    </div>
  );
}
