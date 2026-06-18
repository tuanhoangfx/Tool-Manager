import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { MOCK } from "./mock";
import { DataGrid, FauxHeader, FreshBar, StatusPill } from "./parts";

type Tab = "columns" | "filters" | "sync";

/** V2 — Source Cards + Inspector tabs: TOC thẻ source · grid giữa · cột phải 1 khung inspector 3 tab. */
export function V2SourceCardsInspector() {
  const [active, setActive] = useState<string>(MOCK.activeId);
  const [tab, setTab] = useState<Tab>("columns");

  return (
    <div className="swpv swpv-frame">
      <FauxHeader section="Inspector" />
      <div className="swpv-body" style={{ gridTemplateColumns: "220px 1fr 250px" }}>
        {/* LEFT — source cards */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            <LayoutGrid size={12} /> Nguồn dữ liệu
          </div>
          <div className="swpv-col__body space-y-2" style={{ paddingTop: 4 }}>
            {MOCK.sources.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`swpv-card ${active === s.id ? "is-active" : ""}`}
                onClick={() => setActive(s.id)}
              >
                <div className="flex items-center gap-2">
                  <s.icon size={14} className="shrink-0" />
                  <span className="swpv-card__title min-w-0 flex-1 truncate">{s.title}</span>
                  <StatusPill status={s.status} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <FreshBar fresh={s.fresh} tone={s.tone} />
                  <span className="swpv-chip">{s.rows.toLocaleString("vi-VN")}</span>
                </div>
                <p className="swpv-muted mt-1" style={{ fontSize: 10 }}>{s.lastSynced}</p>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — grid */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            Bảng dữ liệu
            <span className="swpv-count">7/9 cột</span>
          </div>
          <div className="swpv-col__body">
            <DataGrid />
          </div>
        </div>

        {/* RIGHT — inspector with segmented tabs */}
        <div className="swpv-col">
          <div className="swpv-col__body space-y-2">
            <div className="swpv-seg">
              <button type="button" className={tab === "columns" ? "is-active" : ""} onClick={() => setTab("columns")}>Columns</button>
              <button type="button" className={tab === "filters" ? "is-active" : ""} onClick={() => setTab("filters")}>Filters</button>
              <button type="button" className={tab === "sync" ? "is-active" : ""} onClick={() => setTab("sync")}>Sync</button>
            </div>

            {tab === "columns" && (
              <div>
                {MOCK.columns.map((c) => (
                  <div key={c.key} className="swpv-opt">
                    <span className="swpv-opt__label">{c.label}</span>
                    <span className="swpv-opt__value">{c.visible ? "Hiện" : "Ẩn"}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "filters" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {MOCK.filters.map((f) => (
                    <span key={f.key} className="swpv-filterchip">
                      {f.label}: {f.value}
                    </span>
                  ))}
                </div>
                {MOCK.options.slice(0, 3).map((o) => (
                  <div key={o.key} className="swpv-opt">
                    <span>
                      <span className="swpv-opt__label block">{o.label}</span>
                      <span className="swpv-opt__hint block">{o.hint}</span>
                    </span>
                    <span className="swpv-opt__value">{o.value}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "sync" && (
              <div>
                {MOCK.log.slice(0, 5).map((l) => (
                  <div key={l.id} className="swpv-log">
                    <span className="swpv-log__time">{l.time}</span>
                    <span className="swpv-log__target">{l.source}</span>
                    <StatusPill status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
