import type { TwofaAccount } from "../twofa/types";
import { parsePlanFieldsFromNote } from "../twofa/twofa-plan-fields";
import { quotaEnrollmentIso } from "./twofa-quota-enrolled";
import type { CockpitImportPatch, QuotaProbeResult } from "./quota-types";

export function applyQuotaProbeToAccount(
  account: TwofaAccount,
  result: QuotaProbeResult,
  now = new Date().toISOString(),
): TwofaAccount {
  const parsed = parsePlanFieldsFromNote(account.note);
  return {
    ...account,
    updatedAt: now,
    quotaSnapshot: result.quotaSnapshot,
    quotaCheckedAt: result.quotaCheckedAt,
    quotaStatus: result.quotaStatus,
    ...(result.planPackage && !account.planPackage ? { planPackage: result.planPackage } : {}),
    ...(result.planTier && !account.planTier ? { planTier: result.planTier } : {}),
    ...(parsed.planPackage && !account.planPackage ? { planPackage: parsed.planPackage } : {}),
    ...(parsed.planStatus && !account.planStatus ? { planStatus: parsed.planStatus } : {}),
    ...(parsed.planTier && !account.planTier ? { planTier: parsed.planTier } : {}),
    ...(parsed.planExpiresAt && !account.planExpiresAt ? { planExpiresAt: parsed.planExpiresAt } : {}),
  };
}

export function applyCockpitImportToAccount(
  account: TwofaAccount,
  patch: CockpitImportPatch,
  now = new Date().toISOString(),
): TwofaAccount {
  return {
    ...account,
    updatedAt: now,
    quotaEnrolledAt: account.quotaEnrolledAt ?? patch.quotaEnrolledAt ?? quotaEnrollmentIso(new Date(now)),
    ...(patch.planPackage ? { planPackage: patch.planPackage } : {}),
    ...(patch.planTier ? { planTier: patch.planTier } : {}),
    ...(patch.quotaSnapshot ? { quotaSnapshot: patch.quotaSnapshot } : {}),
    ...(patch.quotaCheckedAt ? { quotaCheckedAt: patch.quotaCheckedAt } : {}),
    ...(patch.quotaStatus ? { quotaStatus: patch.quotaStatus } : {}),
    ...(patch.note ? { note: patch.note } : {}),
    ...(patch.password && !account.password?.trim() ? { password: patch.password } : {}),
  };
}
