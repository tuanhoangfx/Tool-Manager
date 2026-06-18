import { DesignTemplatePage } from "./design-template/DesignTemplatePage";
import { useNotesAuth } from "../notes/AuthSessionProvider";

export function SystemDesignTemplateScreen() {
  const { session } = useNotesAuth();
  if (!session) return null;
  return <DesignTemplatePage />;
}
