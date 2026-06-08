import { hubAuthEmailFromLogin, looksLikeEmail } from "@tool-workspace/hub-identity";

/** Share / member grant — User ID (CS00761) → cs00761@infix1.io.vn; emails unchanged. */
export function normalizeGranteeEmail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (looksLikeEmail(trimmed)) return trimmed.toLowerCase();
  return hubAuthEmailFromLogin(trimmed);
}
