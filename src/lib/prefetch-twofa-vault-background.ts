import { ensureTwofaAuth } from "./ensure-twofa-auth";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";
import { getTwofaStorageUserId, loadAccounts, saveAccounts } from "../features/twofa/storage";
import {
  hasTwofaSyncWatermark,
  isTwofaCloudAvailable,
  runTwofaCloudSync,
} from "../features/twofa/twofa-cloud-sync";
import { dedupeTwofaAccounts } from "../features/twofa/twofa-upsert-accounts";
import { filterTwofaPendingDeletes } from "../features/twofa/twofa-sync-pending";

let lastRunAt = 0;
const MIN_INTERVAL_MS = 45_000;

/** Warm 2FA vault localStorage + silent cloud delta before first tab open. */
export function prefetchTwofaVaultBackground(): void {
  if (!isTwofaSupabaseConfigured || !isTwofaCloudAvailable()) return;
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;

  void (async () => {
    try {
      const session = await ensureTwofaAuth();
      const uid = session?.user?.id ?? getTwofaStorageUserId();
      if (!uid) return;

      const getLocal = () => loadAccounts(uid);
      const { accounts: merged, error } = await runTwofaCloudSync(getLocal, {
        full: !hasTwofaSyncWatermark(uid),
      });
      if (error) return;

      const { accounts: deduped } = dedupeTwofaAccounts(merged);
      saveAccounts(filterTwofaPendingDeletes(deduped), uid);
      lastRunAt = Date.now();
    } catch {
      /* auth not ready */
    }
  })();
}
