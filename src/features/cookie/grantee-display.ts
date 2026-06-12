import {
  hubAuthEmailFromLogin,
  hubAuthEmailsFromLogin,
  loginIdFromSyntheticEmail,
  looksLikeEmail,
} from "@tool-workspace/hub-identity";

/** Canonical synthetic emails to match auth.users (primary + legacy Hub domain). */
export function granteeLookupEmails(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (looksLikeEmail(trimmed)) return [trimmed.toLowerCase()];
  try {
    return hubAuthEmailsFromLogin(trimmed);
  } catch {
    return [];
  }
}

/** Share input → stored grantee_email (primary synthetic domain). */
export function normalizeGranteeEmail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (looksLikeEmail(trimmed)) return trimmed.toLowerCase();
  return hubAuthEmailFromLogin(trimmed);
}

/** Access table label — prefer Hub User ID (CS00642) over synthetic email. */
export function displayGranteeUser(member: {
  grantee_email?: string | null;
  grantee_user_id?: string | null;
}): string {
  const loginId = loginIdFromSyntheticEmail(member.grantee_email);
  if (loginId) return loginId.toUpperCase();
  if (member.grantee_email?.trim()) return member.grantee_email.trim();
  return member.grantee_user_id?.slice(0, 8) ?? "shared-user";
}

/** Preview line under share input — shows resolved User ID + email. */
export function formatGranteeSharePreview(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (looksLikeEmail(trimmed)) return trimmed.toLowerCase();
  try {
    const emails = hubAuthEmailsFromLogin(trimmed);
    const loginId = trimmed.toLowerCase();
    return `${loginId.toUpperCase()} → ${emails[0]}`;
  } catch {
    return null;
  }
}
