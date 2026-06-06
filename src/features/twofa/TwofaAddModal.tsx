import { TwofaAddForm, type TwofaAddFormProps } from "./TwofaAddForm";

type Props = Omit<TwofaAddFormProps, "active" | "variant"> & {
  open: boolean;
};

/** 2FA add/edit — golden HubToolDetailModal shell. */
export function TwofaAddModal({ open, ...rest }: Props) {
  return <TwofaAddForm active={open} variant="hub-modal" {...rest} />;
}
