/** Padded task id for display/search — no # prefix. */
export function formatTaskId(id: number) {
  return id.toString().padStart(4, "0");
}
