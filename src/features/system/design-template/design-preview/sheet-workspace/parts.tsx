import { RefreshCw, Table2, Upload } from "lucide-react";
import { MOCK, STATUS_META, type SyncStatus } from "./mock";

/** Faux header — khớp SheetHubChrome thật: Table2 cyan + center stats + actions Import/Sync. */
export function FauxHeader({ section }: { section: string }) {
  const { sheets, active, rows, cols } = MOCK.stats;
  return (
    <div className="swpv-header">
      <div className="swpv-header__top">
        <div className="flex items-center gap-2">
          <Table2 size={14} className="text-cyan-300" />
          <span className="swpv-header__title">Sheet · {section}</span>
        </div>
        <div className="swpv-header__stats">
          <Stat label="sheets" value={sheets} tone="cyan" />
          <Stat label="active" value={active} tone="purple" />
          <Stat label="rows" value={rows} tone="emerald" />
          <Stat label="cols" value={cols} tone="slate" />
        </div>
        <div className="swpv-header__actions">
          <button type="button" className="swpv-btn swpv-btn--run">
            <Upload size={12} /> Import
          </button>
          <button type="button" className="swpv-btn swpv-btn--ghost">
            <RefreshCw size={12} /> Sync
          </button>
        </div>
      </div>
      <div className="swpv-header__rule">
        <span>{section}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="swpv-stat">
      <span className={`swpv-dot swpv-dot--${tone}`} />
      <strong>{value.toLocaleString("vi-VN")}</strong>
      <em>{label}</em>
    </span>
  );
}

export function StatusPill({ status }: { status: SyncStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`swpv-status ${meta.cls}`}>
      <span className={`swpv-dot ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/** Center data grid — CSV preview dùng chung cho mọi variant. */
export function DataGrid({ rows = 6 }: { rows?: number }) {
  const { header, rows: data } = MOCK.grid;
  const numCols = new Set([3, 4, 5]); // SL · Đơn giá · Thành tiền
  const tagCols = new Set([6]); // Kênh
  return (
    <div className="swpv-grid-wrap">
      <table className="swpv-table">
        <thead>
          <tr>
            {header.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, rows).map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={numCols.has(c) ? "num" : ""}>
                  {tagCols.has(c) ? <span className="swpv-tag">{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Freshness bar — % dữ liệu còn "tươi" (vừa sync). */
export function FreshBar({ fresh, tone = "cyan" }: { fresh: number; tone?: string }) {
  const pct = Math.min(100, Math.max(0, fresh));
  return (
    <div className="swpv-freshbar" title={`${pct}% tươi`}>
      <span className={`swpv-freshbar__fill swpv-freshbar__fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
