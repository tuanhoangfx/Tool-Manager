export type TaskSearchHighlight = {
  idTerms: string[];
  titleTerms: string[];
};

export {
  extractNumericSearchTerm,
  buildHighlightSegments,
  type HighlightSegment,
} from "@tool-workspace/hub-ui";

import { getDirectorySearchHighlight, type DirectorySearchHighlight } from "@tool-workspace/hub-ui";

/** Highlight terms aligned with `matchesTodoTaskSearch` — id badge vs title. */
export function getTaskSearchHighlight(searchTerm: string): TaskSearchHighlight | null {
  const highlight = getDirectorySearchHighlight(searchTerm, { mixedRequiresWhitespace: false });
  if (!highlight) return null;
  return { idTerms: highlight.idTerms, titleTerms: highlight.textTerms };
}

export type { DirectorySearchHighlight };
