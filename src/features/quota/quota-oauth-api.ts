import type { CockpitImportOutcome } from "./quota-api";

export type QuotaOAuthPlatform = "cursor" | "gemini";

export type QuotaOAuthStart = {
  loginId: string;
  verificationUri: string;
  expiresIn: number;
  intervalSeconds: number;
  callbackUrl?: string;
};

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

export async function startQuotaOAuth(platform: QuotaOAuthPlatform): Promise<QuotaOAuthStart> {
  return postJson<QuotaOAuthStart>(`/api/quota-oauth/${platform}/start`);
}

export async function completeQuotaOAuth(
  platform: QuotaOAuthPlatform,
  loginId: string,
): Promise<CockpitImportOutcome> {
  return postJson<CockpitImportOutcome>(`/api/quota-oauth/${platform}/complete`, { loginId });
}

export async function cancelQuotaOAuth(platform: QuotaOAuthPlatform, loginId?: string): Promise<void> {
  await postJson(`/api/quota-oauth/${platform}/cancel`, loginId ? { loginId } : {});
}

export async function submitGeminiOAuthManualCallback(loginId: string, callbackUrl: string): Promise<void> {
  await postJson("/api/quota-oauth/gemini/manual", { loginId, callbackUrl });
}
