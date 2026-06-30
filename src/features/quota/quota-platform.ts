export type QuotaPlatformId =
  | "claude"
  | "openai"
  | "chatgpt"
  | "grok"
  | "google"
  | "gemini"
  | "cursor"
  | "unknown";

const PLATFORM_PATTERNS: { id: QuotaPlatformId; re: RegExp }[] = [
  { id: "cursor", re: /cursor/i },
  { id: "claude", re: /claude|anthropic/i },
  { id: "grok", re: /grok|xai|x\.ai/i },
  { id: "gemini", re: /gemini/i },
  { id: "google", re: /google|gmail/i },
  { id: "chatgpt", re: /chatgpt|openai|gpt|codex/i },
  { id: "openai", re: /openai/i },
];

export function resolveQuotaPlatform(service: string): QuotaPlatformId {
  const trimmed = service.trim();
  if (!trimmed) return "unknown";
  for (const item of PLATFORM_PATTERNS) {
    if (item.re.test(trimmed)) return item.id;
  }
  return "unknown";
}

export function isQuotaTrackableService(service: string): boolean {
  return resolveQuotaPlatform(service) !== "unknown";
}

export function quotaPlatformLabel(platform: QuotaPlatformId): string {
  switch (platform) {
    case "claude":
      return "Claude";
    case "openai":
    case "chatgpt":
      return "ChatGPT";
    case "grok":
      return "Grok";
    case "google":
      return "Google";
    case "gemini":
      return "Gemini";
    case "cursor":
      return "Cursor";
    default:
      return "Unknown";
  }
}
