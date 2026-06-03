import { normalizeSecret } from "./totp";

export type ParsedTwofaSearch = {
  service: string;
  account: string;
  secret: string;
  /** True when query looks like a Base32 secret payload. */
  isSecretQuery: boolean;
};

const BASE32_RE = /^[A-Z2-7]+=*$/i;

export function isLikelyBase32Secret(raw: string): boolean {
  const s = normalizeSecret(raw);
  return s.length >= 16 && BASE32_RE.test(s);
}

/** Parse hub search: `service:account`, `service|account`, or raw secret / service name. */
export function parseTwofaSearchQuery(raw: string): ParsedTwofaSearch {
  const q = raw.trim();
  if (!q) {
    return { service: "", account: "", secret: "", isSecretQuery: false };
  }

  if (isLikelyBase32Secret(q)) {
    return { service: "", account: "", secret: normalizeSecret(q), isSecretQuery: true };
  }

  const sep = q.includes(":") ? ":" : q.includes("|") ? "|" : null;
  if (sep) {
    const [a, b] = q.split(sep).map((p) => p.trim());
    return {
      service: a,
      account: b,
      secret: "",
      isSecretQuery: false,
    };
  }

  return { service: q, account: "", secret: "", isSecretQuery: false };
}
