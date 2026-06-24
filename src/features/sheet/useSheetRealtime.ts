import { useEffect, useRef } from "react";
import { addSheetSourcesRealtimeListener } from "./sheet-sources-realtime-hub";
import { isSheetSourcesCloudAvailable } from "./sheet-sources-cloud";

/** Pull cloud reconcile when another tab/device mutates sheet_sources. */
export function useSheetRealtime(onChange: () => void, userId: string | null, enabled = true) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!userId || !enabled || !isSheetSourcesCloudAvailable()) return;
    return addSheetSourcesRealtimeListener(userId, () => onChangeRef.current());
  }, [userId, enabled]);
}
