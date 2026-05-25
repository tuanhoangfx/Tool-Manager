import { DesignSection, Glass } from "../../../theme/p0008";
import { V1SourceTable } from "./V1-SourceTable";
import { V2CommandCenter } from "./V2-CommandCenter";
import { V3RouteMatrix } from "./V3-RouteMatrix";
import { V4ModalOps } from "./V4-ModalOps";
import { V5ExtensionMirror } from "./V5-ExtensionMirror";
import "./cookie-sync-design-preview.css";

export function CookieSyncDesignPreview() {
  return (
    <div className="space-y-5">
      <Glass tone="indigo">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Design Template</p>
            <h2 className="mt-1 text-xl font-semibold">Cookie Auto · 5 design options</h2>
            <p className="mt-1 max-w-3xl text-xs text-[var(--muted)]">
              Preview only: table/modal web redesign plus extension status direction for source-locked cookie sync.
            </p>
          </div>
          <a className="btn-ghost btn text-[11px]" href="?screen=cookie">
            Back to Cookie Auto
          </a>
        </div>
      </Glass>
      <DesignSection num="V1" title="Source Locked Table" lang="Dense Hub table with source lock column and row actions">
        <V1SourceTable />
      </DesignSection>
      <DesignSection num="V2" title="Command Center" lang="Operator dashboard: source band, targets, prominent commands">
        <V2CommandCenter />
      </DesignSection>
      <DesignSection num="V3" title="Route Matrix" lang="Permission map for many browsers and many routes">
        <V3RouteMatrix />
      </DesignSection>
      <DesignSection num="V4" title="Modal Operations" lang="Clean table; add/edit/delete/source setup inside modal">
        <V4ModalOps />
      </DesignSection>
      <DesignSection num="V5" title="Extension Mirror" lang="Web preview of the extension popup visual language">
        <V5ExtensionMirror />
      </DesignSection>
    </div>
  );
}
