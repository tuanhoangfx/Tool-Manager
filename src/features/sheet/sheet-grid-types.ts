export type SheetGridData = {
  header: string[];
  rows: string[][];
  /** Background parse still merging rows beyond the initial viewport chunk. */
  loadingMoreRows?: boolean;
};
