export type TwofaAccount = {
  id: string;
  service: string;
  /** Optional 4-digit browser profile code (e.g. 0100, 0101). */
  browser?: string;
  account: string;
  /** Optional login password (stored locally). */
  password?: string;
  secret: string;
  createdAt: string;
  updatedAt: string;
  /** Set when a code is copied or the row is actively used (for time-range filters). */
  lastUsedAt?: string;
};

export type TwofaDraft = {
  service: string;
  browser?: string;
  account: string;
  password?: string;
  secret: string;
};
