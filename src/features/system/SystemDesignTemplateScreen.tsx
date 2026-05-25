import { Palette, Settings2 } from "lucide-react";
import { CookieSyncDesignPreview } from "../design-preview/cookie-sync-design-preview";
import { Glass } from "../../theme/p0008";

const TEMPLATES = [
  {
    id: "cookie-sync",
    label: "Cookie Auto",
    status: "preview",
    blurb: "Source-locked web table/modal + extension popup refresh",
  },
  {
    id: "notes",
    label: "Notes",
    status: "locked",
    blurb: "Production notes shell is already locked",
  },
];

function readTemplateId() {
  if (typeof window === "undefined") return "cookie-sync";
  return new URLSearchParams(window.location.search).get("dtpl") || "cookie-sync";
}

function setTemplateId(id: string) {
  const p = new URLSearchParams(window.location.search);
  p.set("screen", "system");
  p.set("stab", "template");
  p.set("dtpl", id);
  window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function SystemDesignTemplateScreen() {
  const active = readTemplateId();
  return (
    <div className="space-y-4">
      <Glass tone="purple">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">System</p>
            <h1 className="mt-1 text-xl font-semibold">Design Template</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Locked decisions and preview variants before production UI changes.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1.5 text-xs text-purple-100">
            <Settings2 size={14} />
            P0020 template gate
          </span>
        </div>
      </Glass>

      <div className="grid gap-3 md:grid-cols-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`rounded-xl border p-4 text-left transition ${
              active === template.id
                ? "border-indigo-400/40 bg-indigo-500/12"
                : "border-white/10 bg-white/[.03] hover:border-white/20"
            }`}
            onClick={() => setTemplateId(template.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <Palette size={15} />
                {template.label}
              </span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {template.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{template.blurb}</p>
          </button>
        ))}
      </div>

      {active === "cookie-sync" ? (
        <CookieSyncDesignPreview />
      ) : (
        <Glass tone="emerald">
          <p className="text-sm text-emerald-100">This template is locked in production.</p>
        </Glass>
      )}
    </div>
  );
}
