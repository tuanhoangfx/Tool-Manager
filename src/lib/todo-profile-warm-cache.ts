import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../features/todo/types";

const warmByUserId = new Map<string, Profile>();

export function readWarmTodoProfile(userId: string | undefined): Profile | null {
  if (!userId) return null;
  return warmByUserId.get(userId) ?? null;
}

export function writeWarmTodoProfile(userId: string, profile: Profile): void {
  warmByUserId.set(userId, profile);
}

export function clearWarmTodoProfile(userId?: string): void {
  if (userId) warmByUserId.delete(userId);
  else warmByUserId.clear();
}

export function sessionUserId(session: Session | null | undefined): string | undefined {
  return session?.user?.id;
}
