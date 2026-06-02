export type TwofaAccount = {
  id: string;
  service: string;
  account: string;
  secret: string;
  createdAt: string;
  updatedAt: string;
  /** Set when a code is copied or the row is actively used (for time-range filters). */
  lastUsedAt?: string;
};

export type TwofaDraft = {
  service: string;
  account: string;
  secret: string;
};
