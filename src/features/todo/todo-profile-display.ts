import {
  hubAuthEmailsForSignIn,
  hubDisplayEmail,
  hubDisplayLoginId,
} from "@tool-workspace/hub-identity";
import type { Profile } from "./types";

/** Hub User ID (CS00642) derived from auth email — P0004 Users parity. */
export function todoProfileLoginId(profile: Pick<Profile, "email">): string {
  return hubDisplayLoginId({ authEmail: profile.email });
}

/** Contact email for labels — hides synthetic @infix1.io.vn addresses. */
export function todoProfileContactEmail(profile: Pick<Profile, "email">): string {
  return hubDisplayEmail({ authEmail: profile.email, profileEmail: profile.email });
}

/** Compact assignee trigger — modal filter row (single line). */
export function todoProfileAssigneeTriggerLabel(profile: Profile): string {
  const loginId = todoProfileLoginId(profile);
  if (loginId) return loginId.toUpperCase();
  return profile.full_name?.trim() || todoProfileContactEmail(profile) || profile.id.slice(0, 8);
}

/** Full label for assignee trigger tooltip (email, name, User ID). */
export function todoProfileAssigneeTooltip(profile: Profile): string {
  return todoProfileDisplayLabel(profile);
}

/** Assignee / creator filter label — searchable by User ID, name, or email. */
export function todoProfileDisplayLabel(profile: Profile): string {
  const loginId = todoProfileLoginId(profile);
  const contact = todoProfileContactEmail(profile);
  const name = profile.full_name?.trim();
  if (loginId && contact) {
    const who = name && name.toLowerCase() !== loginId ? `${name} · ${contact}` : contact;
    return `${loginId.toUpperCase()} · ${who}`;
  }
  if (loginId) return loginId.toUpperCase();
  return name || contact || profile.email || profile.id.slice(0, 8);
}

export function todoProfileEmailKeys(email: string | null | undefined): string[] {
  if (!email?.trim()) return [];
  return hubAuthEmailsForSignIn(email.trim());
}
