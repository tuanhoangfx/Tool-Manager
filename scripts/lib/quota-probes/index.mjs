import { credentialKind, extractQuotaCredential } from "./credentials.mjs";
import { probeAnthropicApiKey, probeClaudeQuota } from "./claude.mjs";
import { probeOpenAiApiKey } from "./openai.mjs";
import { probeGrokApiKey } from "./grok.mjs";

const PLATFORM_SERVICE_RE = [
  { platform: "cursor", re: /cursor/i },
  { platform: "claude", re: /claude|anthropic/i },
  { platform: "grok", re: /grok|xai|x\.ai/i },
  { platform: "gemini", re: /gemini|google/i },
  { platform: "openai", re: /chatgpt|openai|gpt|codex/i },
];

function resolvePlatform(service) {
  for (const item of PLATFORM_SERVICE_RE) {
    if (item.re.test(service)) return item.platform;
  }
  return "unknown";
}

export async function probeVaultAccountQuota(row) {
  const platform = resolvePlatform(row.service ?? "");
  const token = extractQuotaCredential(row.password, row.note);
  if (!token) {
    return {
      quotaStatus: "no_credential",
      snapshot: {
        platform,
        metrics: [],
        error: "No API/OAuth token found in password or note",
        probedAt: new Date().toISOString(),
      },
    };
  }

  if (platform === "unknown") {
    return {
      quotaStatus: "unsupported",
      snapshot: {
        platform: "unknown",
        metrics: [],
        error: `Service "${row.service}" is not a supported quota platform`,
        probedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const kind = credentialKind(token);
    let snapshot;
    if (platform === "claude") {
      snapshot =
        kind === "claude_oauth" ? await probeClaudeQuota(token) : await probeAnthropicApiKey(token);
    } else if (platform === "openai") {
      snapshot = await probeOpenAiApiKey(token);
    } else if (platform === "grok") {
      snapshot = await probeGrokApiKey(token);
    } else if (platform === "gemini") {
      return {
        quotaStatus: "unsupported",
        snapshot: {
          platform: "gemini",
          metrics: [],
          error: "Gemini quota probe requires Google OAuth refresh token (not implemented yet)",
          probedAt: new Date().toISOString(),
        },
      };
    } else {
      return {
        quotaStatus: "unsupported",
        snapshot: {
          platform,
          metrics: [],
          error: "Unsupported platform",
          probedAt: new Date().toISOString(),
        },
      };
    }

    return { quotaStatus: "ok", snapshot };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      quotaStatus: "error",
      snapshot: {
        platform,
        metrics: [],
        error: message,
        probedAt: new Date().toISOString(),
      },
    };
  }
}

export { extractQuotaCredential, resolvePlatform };
