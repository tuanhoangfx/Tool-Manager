export const TWOFA_ACCOUNT_DETAIL_SECTION_CREDENTIALS = "twofa-detail-credentials";
export const TWOFA_ACCOUNT_DETAIL_SECTION_LOG = "twofa-detail-log";

export const TWOFA_ACCOUNT_DETAIL_TOC = [
  { id: TWOFA_ACCOUNT_DETAIL_SECTION_CREDENTIALS, label: "Credentials", emoji: "🔐" },
  { id: TWOFA_ACCOUNT_DETAIL_SECTION_LOG, label: "Log", emoji: "📋" },
] as const;
