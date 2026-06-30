import type { CockpitImportOutcome } from "./quota-api";

export type QuotaOAuthPlatform = "cursor" | "gemini";

export type StealthEnrollStart = {
  platform: QuotaOAuthPlatform;
  profileName: string;
  loginId: string;
  verificationUri: string;
  callbackUrl?: string;
  expiresIn: number;
  intervalSeconds: number;
};

const FETCH_TIMEOUT_MS = 15_000;

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<{ status: number; data: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json()) as T;
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function startStealthQuotaEnroll(
  platform: QuotaOAuthPlatform,
  profileName: string,
): Promise<StealthEnrollStart> {
  const { status, data } = await postJson<StealthEnrollStart>("/api/quota-stealth-enroll/start", {
    platform,
    profileName,
  });
  if (status >= 400) {
    throw new Error((data as { error?: string }).error ?? `Stealth start failed (${status})`);
  }
  return data;
}

export async function pollStealthQuotaEnroll(
  platform: QuotaOAuthPlatform,
  loginId: string,
): Promise<CockpitImportOutcome | "pending"> {
  const { status, data } = await postJson<CockpitImportOutcome & { pending?: boolean; error?: string }>(
    "/api/quota-stealth-enroll/poll",
    { platform, loginId },
  );
  if (status === 202 || (data as { pending?: boolean }).pending) return "pending";
  if (status >= 400) {
    throw new Error(data.error ?? `Stealth poll failed (${status})`);
  }
  return data as CockpitImportOutcome;
}

export async function cancelStealthQuotaEnroll(platform: QuotaOAuthPlatform, loginId?: string): Promise<void> {
  await postJson("/api/quota-stealth-enroll/cancel", loginId ? { platform, loginId } : { platform });
}
