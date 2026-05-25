import { CheckCircle2, LockKeyhole, MonitorUp } from "lucide-react";
import { COOKIE_SYNC_MOCK as MOCK } from "./mock";

export function V1SourceTable() {
  return (
    <div className="cookie-dp v1">
      <div className="dp-hero">
        <div>
          <p className="dp-kicker">Primary-only publish</p>
          <h3>Source locked route table</h3>
          <p>Dense P0004-style table with source lock as a first-class column.</p>
        </div>
        <span className="dp-pill ok"><LockKeyhole size={13} /> Source {MOCK.source.browserId}</span>
      </div>
      <table className="dp-table">
        <thead>
          <tr>
            <th>Route</th>
            <th>Source</th>
            <th>Vault</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {MOCK.routes.map((route) => (
            <tr key={route.domain}>
              <td><strong>{route.domain}</strong><span>{route.note} · {route.syncId}</span></td>
              <td>{route.sourceBrowserId ? <span className="dp-chip emerald">{route.sourceBrowserId}</span> : <span className="dp-chip amber">Unset</span>}</td>
              <td>{route.vault}<span>{route.version}</span></td>
              <td><span className="dp-chip indigo"><CheckCircle2 size={12} /> {route.status}</span></td>
              <td><button>Manage</button><button>Apply</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dp-foot"><MonitorUp size={14} /> Best for power-user route management.</div>
    </div>
  );
}
