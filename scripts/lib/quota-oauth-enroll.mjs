import { mapCockpitAccount } from "./cockpit-quota-mapper.mjs";
import { buildCockpitQuotaPatches } from "./cockpit-quota-import.mjs";

/** After OAuth + Cockpit store, build vault patches for enrolled quota row. */
export function buildQuotaEnrollPatches(vaultRows, platform, cockpitAccount) {
  const mapped = mapCockpitAccount(platform, cockpitAccount);
  if (!mapped?.email) throw new Error(`Could not map ${platform} account after OAuth`);
  const { patches, creates } = buildCockpitQuotaPatches(vaultRows, [mapped], { createMissing: true });
  return { mapped, patches, creates };
}

export function formatEnrollOutcome(clientPatches, creates, mapped) {
  return {
    cockpitCount: 1,
    matched: clientPatches.length,
    created: creates.length,
    skipped: 0,
    email: mapped.email,
    platform: mapped.cockpitPlatform,
    planPackage: mapped.planPackage,
    planTier: mapped.planTier,
    quotaStatus: mapped.quotaStatus,
    metrics: mapped.quotaSnapshot?.metrics ?? [],
    accounts: [
      {
        email: mapped.email,
        platform: mapped.cockpitPlatform,
        quotaStatus: mapped.quotaStatus,
        metrics: mapped.quotaSnapshot?.metrics ?? [],
      },
    ],
    unmatched: [],
    patches: clientPatches,
  };
}
