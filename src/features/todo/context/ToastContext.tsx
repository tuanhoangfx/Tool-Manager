import type { ReactNode } from "react";
import { useAppToast } from "../../../components/toast";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

/** Adapter — delegates to P0020 workspace ToastProvider. */
export const useToasts = () => {
  const { pushToast, dismissToast, toasts } = useAppToast();
  return {
    toasts: toasts.map((t) => ({
      id: t.id,
      message: t.message,
      type: (t.type === "warn" ? "info" : t.type) as ToastType,
    })),
    addToast: (message: string, type: ToastType) => pushToast(message, type),
    removeToast: dismissToast,
  };
};

/** No-op — workspace shell already wraps ToastProvider. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return children;
}
