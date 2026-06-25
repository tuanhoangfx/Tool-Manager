import { useEffect, useState } from "react";
import { readTwofaVaultView, type TwofaVaultView } from "../../lib/twofa-vault-path";

/** Sync Account Vault sub-view (`/twofa/services` | `/twofa/mail`) with popstate. */
export function useTwofaVaultView(): TwofaVaultView {
  const [view, setView] = useState<TwofaVaultView>(() => readTwofaVaultView());

  useEffect(() => {
    const sync = () => setView(readTwofaVaultView());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return view;
}
