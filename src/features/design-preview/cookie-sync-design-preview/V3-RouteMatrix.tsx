import { Fragment } from "react";
import { CircleDot, GitBranch, LockKeyhole } from "lucide-react";
import { COOKIE_SYNC_MOCK as MOCK } from "./mock";

export function V3RouteMatrix() {
  return (
    <div className="cookie-dp v3">
      <div className="dp-hero">
        <div>
          <p className="dp-kicker">Matrix</p>
          <h3>Routes x browsers permission map</h3>
          <p>Shows write/read capability per browser, ideal when many profiles are linked.</p>
        </div>
        <GitBranch size={30} />
      </div>
      <div className="dp-matrix">
        <div className="dp-matrix-head">Route</div>
        <div className="dp-matrix-head">0010 source</div>
        <div className="dp-matrix-head">0100 test</div>
        <div className="dp-matrix-head">Laptop</div>
        {MOCK.routes.map((route) => (
          <Fragment key={route.domain}>
            <div className="dp-matrix-route">
              <strong>{route.domain}</strong>
              <span>{route.note}</span>
            </div>
            <div className="dp-cell source"><LockKeyhole size={14} /> publish</div>
            <div className="dp-cell read"><CircleDot size={14} /> apply only</div>
            <div className="dp-cell read"><CircleDot size={14} /> apply only</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
