import { useState } from "react";
import { Cookie, Eye, Link2, Save, Trash2, X } from "lucide-react";
import { Glass, StatusBadge } from "../../../theme/p0008";
import { readNoteIdFromUrl } from "../design-nav";
import { COOKIE_LINES, MOCK_NOTES, SAMPLE_MD } from "../mock-data";
import { PageHeader } from "./PageHeader";

/** V5 drawer — interactive prototype (local state only, no save). */
export function NoteEditScreen({ onClose }: { onClose?: () => void }) {
  const noteId = readNoteIdFromUrl() ?? "n1";
  const note = MOCK_NOTES.find((n) => n.id === noteId) ?? MOCK_NOTES[0];
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(SAMPLE_MD);
  const [savedHint, setSavedHint] = useState("");

  return (
    <div className="anim-fade">
      <PageHeader
        title="Chỉnh sửa note"
        desc={`Drawer V5 · note: ${note.id} — có thể gõ thử, Lưu chỉ hiện thông báo mock.`}
        actions={
          <>
            <button type="button" className="btn-ghost btn text-[12px]" onClick={onClose}>
              <X size={14} />
              Đóng
            </button>
            <button
              type="button"
              className="btn-ghost btn text-[12px] text-rose-300"
              onClick={() => setSavedHint("Xóa — Sprint 1")}
            >
              <Trash2 size={14} />
            </button>
            <button type="button" className="btn text-[12px]" onClick={() => setSavedHint("Đã lưu mock (không ghi DB)")}>
              <Save size={14} />
              Lưu
            </button>
          </>
        }
      />

      {savedHint ? (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
          {savedHint}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <button
          type="button"
          onClick={onClose}
          className="hidden w-full rounded-xl border border-white/5 bg-black/20 p-4 text-left opacity-40 transition-opacity hover:opacity-60 lg:block"
        >
          <p className="text-[11px] text-[var(--muted)]">← Bấm để về Gallery</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MOCK_NOTES.map((n) => (
              <div
                key={n.id}
                className={`h-20 rounded-lg border ${n.id === noteId ? "border-indigo-400/40" : "border-white/10"} bg-white/[.02]`}
              />
            ))}
          </div>
        </button>

        <div className="anim-right space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <Glass tone="indigo" className="!p-3">
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Tiêu đề</label>
            <input className="field text-[13px] font-medium" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="mb-1 mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Slug</label>
            <input className="field font-mono text-[11px]" defaultValue={note.slug} />
            <label className="mb-1 mt-3 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Domain cookie</label>
            <input className="field font-mono text-[11px]" defaultValue={note.domain} />
          </Glass>

          <Glass tone="indigo" label="Nội dung markdown" className="flex flex-col">
            <div className="mb-2 flex justify-end">
              <button type="button" className="btn-ghost btn text-[11px]">
                <Eye size={12} />
                Preview
              </button>
            </div>
            <textarea
              className="field min-h-[11rem] resize-y font-mono text-[11px] leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Glass>

          <Glass tone="amber" label="Cookie snapshot" icon={<Cookie size={12} />}>
            <div className="mb-2 flex items-center justify-between">
              <StatusBadge tone="emerald">Hourly · masked</StatusBadge>
              <span className="text-[10px] text-[var(--muted)]">read-only</span>
            </div>
            <ul className="space-y-0.5 font-mono text-[10px] text-indigo-200/80">
              {COOKIE_LINES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Glass>

          <Glass tone="cyan" label="Share" icon={<Link2 size={12} />}>
            <div className="flex gap-2">
              <input className="field flex-1 font-mono text-[10px]" defaultValue="https://infix1.io.vn/notes/share/k7xm…" />
              <button type="button" className="btn-ghost btn shrink-0 text-[11px]" onClick={() => setSavedHint("Đã copy link (mock)")}>
                Copy
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[11px]">
              <input type="checkbox" defaultChecked />
              Bật share (password)
            </label>
          </Glass>
        </div>
      </div>
    </div>
  );
}
