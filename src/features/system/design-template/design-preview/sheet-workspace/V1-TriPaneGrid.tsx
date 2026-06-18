import { useState } from "react";
import { Columns3, FolderTree, ScrollText } from "lucide-react";
import { MOCK } from "./mock";
import { DataGrid, FauxHeader, FreshBar, StatusPill } from "./parts";

/** V1 — Tri-Pane Grid: TOC sources gom nhóm · grid CSV giữa · cột phải Cột hiển thị (trên) + Sync log (dưới). */
export function V1TriPaneGrid() {
  const [active, setActive] = useState<string>(MOCK.activeId);
  const groups = ["Bán hàng", "Vận hành"] as const;

  return (
    <div className="swpv swpv-frame">
      <FauxHeader section="Doanh thu T6" />
      <div className="swpv-body" style={{ gridTemplateColumns: "210px 1fr 240px" }}>
        {/* LEFT — sources tree */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            <FolderTree size={12} /> Nguồn
            <span className="swpv-count">{MOCK.sources.length}</span>
          </div>
          <div className="swpv-col__body" style={{ paddingTop: 2 }}>
            {groups.map((g) => (
              <div key={g}>
                <div className="swpv-toc-group">{g}</div>
                {MOCK.sources
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`swpv-toc-item ${active === s.id ? "is-active" : ""}`}
                      onClick={() => setActive(s.id)}
                    >
                      <s.icon size={14} />
                      <span className="min-w-0 flex-1">
                        <span className="swpv-toc-item__label block">{s.title}</span>
                        <span className="swpv-toc-item__desc block">
                          {s.rows.toLocaleString("vi-VN")} dòng · {s.cols} cột
                        </span>
                      </span>
                      <StatusPill status={s.status} />
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — CSV grid */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            Bảng dữ liệu
            <span className="swpv-count">1.240 dòng · 7/9 cột</span>
          </div>
          <div className="swpv-col__body">
            <DataGrid />
            <p className="swpv-muted mt-2" style={{ fontSize: 10 }}>
              Trang 1 / 25 · cuộn ngang để xem cột bị cắt · click cell để copy.
            </p>
          </div>
        </div>

        {/* RIGHT — columns (top) + sync log (bottom) */}
        <div className="space-y-2 min-w-0">
          <div className="swpv-col">
            <div className="swpv-col__head">
              <Columns3 size={12} /> Cột hiển thị
            </div>
            <div className="swpv-col__body" style={{ paddingTop: 2 }}>
              {MOCK.columns.slice(0, 6).map((c) => (
                <div key={c.key} className="swpv-opt">
                  <span className="swpv-opt__label">{c.label}</span>
                  <span className="swpv-opt__value">{c.visible ? "Hiện" : "Ẩn"}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <span className="swpv-muted" style={{ fontSize: 10 }}>Độ tươi</span>
                <FreshBar fresh={96} />
                <span style={{ fontSize: 10 }}>96%</span>
              </div>
            </div>
          </div>
          <div className="swpv-col">
            <div className="swpv-col__head">
              <ScrollText size={12} /> Sync log
            </div>
            <div className="swpv-col__body" style={{ paddingTop: 2 }}>
              {MOCK.log.slice(0, 4).map((l) => (
                <div key={l.id} className="swpv-log">
                  <span className="swpv-log__time">{l.time}</span>
                  <span className="swpv-log__target">{l.source}</span>
                  <StatusPill status={l.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
