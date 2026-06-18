import { useState } from "react";
import { GripVertical, Search, SlidersHorizontal } from "lucide-react";
import { MOCK } from "./mock";
import { DataGrid, FauxHeader, StatusPill } from "./parts";

/** V4 — Search-first + Column Manager: TOC lọc nguồn · grid giữa · cột phải drawer quản cột + display prefs. */
export function V4SearchColumnDrawer() {
  const [active, setActive] = useState<string>(MOCK.activeId);
  const [q, setQ] = useState("");
  const list = MOCK.sources.filter((s) => s.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="swpv swpv-frame">
      <FauxHeader section="Column manager" />
      <div className="swpv-body" style={{ gridTemplateColumns: "210px 1fr 250px" }}>
        {/* LEFT — search-first sources */}
        <div className="swpv-col">
          <div className="swpv-col__body" style={{ paddingBottom: 4 }}>
            <div className="relative">
              <Search size={12} className="swpv-muted" style={{ position: "absolute", left: 8, top: 9 }} />
              <input
                className="swpv-search"
                style={{ paddingLeft: 26 }}
                placeholder="Lọc nguồn…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="swpv-col__body" style={{ paddingTop: 0 }}>
            {list.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`swpv-toc-item ${active === s.id ? "is-active" : ""}`}
                onClick={() => setActive(s.id)}
              >
                <s.icon size={14} />
                <span className="swpv-toc-item__label min-w-0 flex-1 truncate">{s.title}</span>
                <StatusPill status={s.status} />
              </button>
            ))}
            {list.length === 0 && <p className="swpv-muted" style={{ fontSize: 11 }}>Không khớp “{q}”.</p>}
          </div>
        </div>

        {/* CENTER — grid */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            Bảng dữ liệu
            <span className="swpv-count">click tiêu đề để sort</span>
          </div>
          <div className="swpv-col__body">
            <DataGrid />
          </div>
        </div>

        {/* RIGHT — column manager drawer + display prefs */}
        <div className="space-y-2 min-w-0">
          <div className="swpv-col">
            <div className="swpv-col__head">
              <SlidersHorizontal size={12} /> Quản lý cột
            </div>
            <div className="swpv-col__body" style={{ paddingTop: 2 }}>
              {MOCK.columns.map((c) => (
                <div key={c.key} className="swpv-colrow">
                  <span className="swpv-colrow__grip"><GripVertical size={12} /></span>
                  <span className="swpv-colrow__name">{c.label}</span>
                  <span className={`swpv-check ${c.visible ? "on" : ""}`}>{c.visible ? "✓" : ""}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="swpv-col">
            <div className="swpv-col__head">Hiển thị</div>
            <div className="swpv-col__body" style={{ paddingTop: 2 }}>
              {MOCK.options.slice(0, 4).map((o) => (
                <div key={o.key} className="swpv-opt">
                  <span className="swpv-opt__label">{o.label}</span>
                  <span className="swpv-opt__value">{o.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
