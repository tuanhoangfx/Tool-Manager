import { createRealtimeHub } from "../../lib/realtime-hub";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

const addSheetSourcesListener = createRealtimeHub(() => (isSupabaseConfigured ? supabase : null), {
  scope: "sheet-sources",
  debounceMs: 400,
  bindingsForUser: (userId) => [
    {
      event: "*",
      table: "sheet_sources",
      filter: `user_id=eq.${userId}`,
    },
  ],
});

/** One Realtime channel per user — sheet list changes from other tabs/devices. */
export function addSheetSourcesRealtimeListener(userId: string, listener: () => void): () => void {
  return addSheetSourcesListener(userId, listener);
}
