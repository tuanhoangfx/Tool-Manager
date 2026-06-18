import { Glass } from "../../../theme/p0008";
import { ACTIVE_DESIGN_COUNT, listActiveDesignFeatures } from "./design-registry";
import { SheetWorkspacePreview } from "./design-preview/sheet-workspace";

/** P0020 System → Design Template — Sheet Workspace under review (5 variants). */
export function DesignTemplatePage() {
  const features = listActiveDesignFeatures();
  const sheet = features.find((f) => f.id === "sheet-workspace");

  return (
    <div className="design-template-page space-y-4 pb-10">
      <Glass tone="purple">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">System</p>
          <h1 className="mt-1 text-xl font-semibold">Design Template</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Active reviews: <strong className="text-cyan-200">{ACTIVE_DESIGN_COUNT}</strong>
            {sheet ? (
              <>
                {" · "}
                <strong className="text-cyan-200/90">{sheet.title}</strong>{" "}
                <span className="text-[var(--muted)]">{sheet.subtitle}</span>
              </>
            ) : null}
          </p>
        </div>
      </Glass>

      <SheetWorkspacePreview />
    </div>
  );
}
