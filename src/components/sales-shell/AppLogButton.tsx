import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FileText } from "lucide-react";
import type { WorkspaceLogEntry } from "../../features/workspace/workspace-log-types";

type Props = {
  logs: WorkspaceLogEntry[];
};

export function AppLogButton({ logs }: Props) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [],
  );

  useLayoutEffect(() => {
    if (!open || !ref.current) return;

    const update = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const mainRect = document.querySelector(".hub-main")?.getBoundingClientRect();
      const minLeft = Math.max(8, (mainRect?.left ?? 0) + 8);
      const availableWidth = Math.max(160, window.innerWidth - minLeft - 8);
      const width = Math.min(320, availableWidth);
      const left = Math.min(Math.max(rect.right - width, minLeft), window.innerWidth - width - 8);
      setPanelStyle({
        position: "fixed",
        left,
        top: rect.bottom + 6,
        width,
        zIndex: 1100,
        maxHeight: "min(70vh, 28rem)",
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn btn-ghost inline-flex items-center gap-1.5 px-2.5"
        title="Usage log"
        onClick={() => setOpen((value) => !value)}
      >
        <FileText size={14} className="text-cyan-300" aria-hidden />
        <span className="hidden sm:inline">Log</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="rounded-xl border border-white/10 bg-[var(--bg)] p-3 shadow-2xl shadow-black/40"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text)]">Usage log</div>
                  <div className="text-[10px] text-[var(--muted)]">Runtime actions in this session</div>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                  {logs.length}
                </span>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-white/5 bg-white/[.025] px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                        <span>{log.scope}</span>
                        <span className="tabular-nums">{formatter.format(log.at)}</span>
                      </div>
                      <div className="mt-0.5 text-xs leading-snug text-[var(--text)]/90">{log.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[var(--muted)]">
                    No actions logged in this session yet.
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
