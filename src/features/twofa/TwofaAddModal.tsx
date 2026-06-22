import { TwofaAddForm, type TwofaAddFormProps } from "./TwofaAddForm";

type Props = Omit<TwofaAddFormProps, "active"> & {
  open: boolean;
};

/** 2FA add — golden HubToolDetailModal shell. */
export function TwofaAddModal({ open, ...rest }: Props) {
  return <TwofaAddForm active={open} {...rest} />;
}
