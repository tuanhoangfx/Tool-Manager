import { createRealtimeHub } from "../../lib/realtime-hub";
import { getTwofaSupabase } from "../../lib/twofa-supabase";

const addTwofaVaultListener = createRealtimeHub(() => getTwofaSupabase(), {
  scope: "twofa-vault",
  debounceMs: 400,
  bindingsForUser: (userId) => [
    {
      event: "*",
      table: "twofa_accounts",
      filter: `user_id=eq.${userId}`,
    },
  ],
});

/** One Realtime channel per 2FA vault user — safe across tabs/components. */
export function addTwofaRealtimeListener(userId: string, listener: () => void): () => void {
  return addTwofaVaultListener(userId, listener);
}
