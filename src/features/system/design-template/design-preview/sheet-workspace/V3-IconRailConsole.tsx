import { useState } from "react";
import { TerminalSquare } from "lucide-react";
import { MOCK, STATUS_META } from "./mock";
import { DataGrid, FauxHeader } from "./parts";

const DOT_COLOR: Record<string, string> = {
  fresh: "rgb(52,211,153)",
  stale: "rgb(251,191,36)",
  syncing: "rgb(34,211,238)",
  error: "rgb(251,113,133)",
};

/** V3 — Icon-Rail + Data Console: rail icon mỗi source · grid + stat-bar · cột phải console sync streaming. */
export function V3IconRailConsole() {
  const [active, setActive] = useState<string>(MOCK.activeId);
  const activeSrc = MOCK.sources.find((s) => s.id === active) ?? MOCK.sources[0];

  return (
    <div className="swpv swpv-frame">
      <FauxHeader section="Live monitor" />
      <div className="swpv-body" style={{ gridTemplateColumns: "54px 1fr 260px" }}>
        {/* LEFT — icon rail */}
        <div className="swpv-col">
          <div className="swpv-iconrail">
            {MOCK.sources.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`swpv-iconrail__btn ${active === s.id ? "is-active" : ""}`}
                title={`${s.title} · ${STATUS_META[s.status].label}`}
                onClick={() => setActive(s.id)}
              >
                <s.icon size={16} />
                <span className="swpv-iconrail__dot" style={{ background: DOT_COLOR[s.status] }} />
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — stat-bar + grid */}
        <div className="swpv-col">
          <div className="swpv-statbar">
            <span><activeSrc.icon size={11} className="inline" /> <strong>{activeSrc.title}</strong></span>
            <span>rows <strong>{activeSrc.rows.toLocaleString("vi-VN")}</strong></span>
            <span>cols <strong>{activeSrc.cols}</strong></span>
            <span>tươi <strong>{activeSrc.fresh}%</strong></span>
            <span className="ml-auto swpv-muted">{activeSrc.lastSynced}</span>
          </div>
          <div className="swpv-col__body">
            <DataGrid />
          </div>
        </div>

        {/* RIGHT — sync console */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            <TerminalSquare size={12} /> Sync console
          </div>
          <div className="swpv-col__body">
            <div className="swpv-console">
              {MOCK.log.map((l) => (
                <div key={l.id} className="swpv-console__line">
                  <span className="swpv-console__t">{l.time}</span>
                  <span style={{ color: STATUS_META[l.status].cls.includes("emerald") ? "rgb(110,231,183)" : undefined }}>
                    [{STATUS_META[l.status].label}]
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.source} — {l.note}</span>
                </div>
              ))}
              <div className="swpv-console__line">
                <span className="swpv-console__t">09:14:41</span>
                <span style={{ color: "rgb(34,211,238)" }}>›</span>
                <span className="swpv-pulse">đang chờ event…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
