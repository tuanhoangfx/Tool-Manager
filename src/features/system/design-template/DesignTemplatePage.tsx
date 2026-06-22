import { Glass } from "../../../theme/p0008";
import { ACTIVE_DESIGN_COUNT, listActiveDesignFeatures } from "./design-registry";
import { SheetWorkspacePreview } from "./design-preview/sheet-workspace";

/** P0020 System → Design Template — active design reviews. */
export function DesignTemplatePage() {
  const features = listActiveDesignFeatures();

  return (
    <div className="design-template-page space-y-4 pb-10">
      <Glass tone="purple">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">System</p>
          <h1 className="mt-1 text-xl font-semibold">Design Template</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Active reviews: <strong className="text-cyan-200">{ACTIVE_DESIGN_COUNT}</strong>
          </p>
          <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
            {features.map((f) => (
              <li key={f.id}>
                <strong className="text-cyan-200/90">{f.title}</strong> — {f.subtitle}
              </li>
            ))}
          </ul>
        </div>
      </Glass>

      <SheetWorkspacePreview />
    </div>
  );
}
