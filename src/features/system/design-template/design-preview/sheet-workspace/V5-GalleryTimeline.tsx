import { useState } from "react";
import { History, SlidersHorizontal } from "lucide-react";
import { MOCK, STATUS_META } from "./mock";
import { DataGrid, FauxHeader, StatusPill } from "./parts";

/**
 * V5 — clone 1:1 layout gallery đã promote ở P0016 (AutomationWorkflowGallery + timeline + options pills):
 * card-gallery TOC trái (icon + label + tone dot + desc + cap bar) · panel grid giữa · cột phải timeline log + options pills.
 */
export function V5GalleryTimeline() {
  const [active, setActive] = useState<string>(MOCK.activeId);
  const activeSrc = MOCK.sources.find((s) => s.id === active) ?? MOCK.sources[0];

  return (
    <div className="swpv swpv-frame">
      <FauxHeader section="Activity" />
      <div className="swpv-body" style={{ gridTemplateColumns: "17rem 1fr 18.5rem" }}>
        {/* LEFT — card gallery (master rail) */}
        <div className="swpv-col" style={{ overflow: "hidden" }}>
          <div className="swpv-gallery">
            <p className="swpv-gallery__group">Nguồn dữ liệu</p>
            {MOCK.sources.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`swpv-gcard ${isActive ? "is-active" : ""}`}
                  onClick={() => setActive(s.id)}
                >
                  <span className="swpv-gcard__top">
                    <Icon size={14} className="shrink-0 text-slate-300" />
                    <span className="swpv-gcard__label">{s.title}</span>
                    <span className={`swpv-gdot swpv-tone--${s.tone}`} aria-hidden />
                  </span>
                  <span className="swpv-gcard__desc">
                    {s.rows.toLocaleString("vi-VN")} dòng · {s.cols} cột · {s.lastSynced}
                  </span>
                  <span className="swpv-gcard__cap">
                    <span className="swpv-cap-bar">
                      <span
                        className={`swpv-cap-bar__fill swpv-tone--${s.tone}`}
                        style={{ width: `${s.fresh}%` }}
                      />
                    </span>
                    <span className="swpv-cap-text">{s.fresh}%</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER — active sheet panel + grid */}
        <div className="swpv-col">
          <div className="swpv-col__head">
            <activeSrc.icon size={12} /> {activeSrc.title}
            <span className="swpv-count">gid {activeSrc.gid}</span>
          </div>
          <div className="swpv-col__body space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusPill status={activeSrc.status} />
              <span className="swpv-muted" style={{ fontSize: 11 }}>
                {activeSrc.rows.toLocaleString("vi-VN")} dòng · {activeSrc.cols} cột · cập nhật {activeSrc.lastSynced}
              </span>
            </div>
            <DataGrid rows={5} />
          </div>
        </div>

        {/* RIGHT — timeline log + read-only options pills */}
        <div className="space-y-3 min-w-0">
          <div className="swpv-rail-card">
            <p className="swpv-rail-head">
              <History size={12} /> Lịch sử sync
            </p>
            <div className="swpv-timeline">
              {MOCK.log.map((l) => (
                <div key={l.id} className={`swpv-timeline__item ${l.status}`}>
                  <div className="swpv-timeline__head">
                    <span className="swpv-timeline__time">{l.time}</span>
                    <span className={`swpv-timeline__status ${STATUS_META[l.status].cls}`}>
                      {STATUS_META[l.status].label}
                    </span>
                    <span className="swpv-timeline__target min-w-0 flex-1">{l.source}</span>
                  </div>
                  <p className="swpv-timeline__detail">{l.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="swpv-rail-card">
            <p className="swpv-rail-head">
              <SlidersHorizontal size={12} /> Tùy chọn hiển thị
            </p>
            <div className="swpv-options">
              {MOCK.options.map((o) => (
                <span key={o.key} className="swpv-option-pill">
                  {o.label}: <strong>{o.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
