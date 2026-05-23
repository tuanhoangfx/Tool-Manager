export type TwofaAccount = {
  id: string;
  service: string;
  account: string;
  secret: string;
  createdAt: string;
  updatedAt: string;
};

export type TwofaDraft = {
  service: string;
  account: string;
  secret: string;
};
