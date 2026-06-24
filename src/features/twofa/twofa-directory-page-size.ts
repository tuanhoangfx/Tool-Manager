/** When a directory has more than this many rows, cap page size for render perf. */
export const TWOFA_LARGE_DIRECTORY_THRESHOLD = 500;

/** Max rows per page for large 2FA vaults (table + card pager). */
export const TWOFA_LARGE_DIRECTORY_MAX_PAGE = 50;

export function resolveTwofaDirectoryPageSize(itemCount: number, userPageSize: number): number {
  if (itemCount <= TWOFA_LARGE_DIRECTORY_THRESHOLD) return userPageSize;
  return Math.min(userPageSize, TWOFA_LARGE_DIRECTORY_MAX_PAGE);
}
