import type { WorkspaceNavScreen } from "../../lib/workspace-screen";

export type NotesAuthGateVariant = "notes" | "cookie-auto" | "twofa" | "system";

/** Map active nav tab → NotesAuthGate variant (anonymous hint copy). */
export function authVariantForNav(nav: WorkspaceNavScreen): NotesAuthGateVariant {
  switch (nav) {
    case "twofa":
      return "twofa";
    case "cookie":
      return "cookie-auto";
    case "system":
      return "system";
    default:
      return "notes";
  }
}
