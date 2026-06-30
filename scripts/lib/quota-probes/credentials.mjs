/** Extract API / OAuth tokens from vault password + note for live quota probes. */

const TOKEN_PATTERNS = [
  /\b(sk-ant-oat[a-zA-Z0-9_-]{20,})\b/,
  /\b(sk-ant-api[a-zA-Z0-9_-]{20,})\b/,
  /\b(sk-proj-[a-zA-Z0-9_-]{20,})\b/,
  /\b(sk-[a-zA-Z0-9]{20,})\b/,
  /\b(xai-[a-zA-Z0-9_-]{20,})\b/,
  /\b(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/,
];

const NOTE_JSON_KEYS = [
  "access_token",
  "accessToken",
  "oauth_access_token",
  "session_token",
  "sessionToken",
  "api_key",
  "apiKey",
  "token",
];

function pickFromJson(value) {
  if (!value || typeof value !== "object") return null;
  for (const key of NOTE_JSON_KEYS) {
    const raw = value[key];
    if (typeof raw === "string" && raw.trim().length >= 20) return raw.trim();
  }
  return null;
}

export function extractQuotaCredential(password, note) {
  const haystacks = [password, note].filter(Boolean).join("\n");
  if (!haystacks.trim()) return null;

  for (const re of TOKEN_PATTERNS) {
    const m = haystacks.match(re);
    if (m?.[1]) return m[1];
  }

  const bearer = haystacks.match(/Bearer\s+([^\s]+)/i);
  if (bearer?.[1]) return bearer[1];

  const jsonBlock = haystacks.match(/\{[\s\S]*\}/);
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock[0]);
      const fromJson = pickFromJson(parsed);
      if (fromJson) return fromJson;
    } catch {
      /* ignore */
    }
  }

  const trimmedPassword = password?.trim();
  if (trimmedPassword && trimmedPassword.length >= 24 && !/\s/.test(trimmedPassword)) {
    return trimmedPassword;
  }

  return null;
}

export function credentialKind(token) {
  if (!token) return "none";
  if (token.startsWith("sk-ant-oat") || (token.startsWith("eyJ") && token.length > 80)) return "claude_oauth";
  if (token.startsWith("sk-ant")) return "anthropic_api";
  if (token.startsWith("sk-proj") || token.startsWith("sk-")) return "openai_api";
  if (token.startsWith("xai-")) return "grok_api";
  return "unknown";
}
