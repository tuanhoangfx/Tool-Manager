import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const TwofaTotpTickContext = createContext(0);

/** Isolated 1s tick — only Code/Period cells subscribe; table rows stay memo-stable. */
export function TwofaTotpTickProvider({
  active = true,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return <TwofaTotpTickContext.Provider value={tick}>{children}</TwofaTotpTickContext.Provider>;
}

export function useTwofaTotpTick(): number {
  return useContext(TwofaTotpTickContext);
}
