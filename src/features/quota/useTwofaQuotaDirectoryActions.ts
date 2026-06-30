import { useCallback, useRef, useState } from "react";
import { useAppToast } from "../../components/toast";
import type { TwofaAccount } from "../twofa/types";
import {
  importCockpitBackupJson,
  isQuotaProbeApiLikelyAvailable,
  probeQuotaAccounts,
  syncCockpitQuotaLocal,
} from "./quota-api";
import type { CockpitImportPatch } from "./quota-types";

type Deps = {
  applyQuotaResults: (results: import("./quota-types").QuotaProbeResult[]) => number;
  applyCockpitImport: (patches: CockpitImportPatch[]) => number;
  syncFromCloud: (opts?: { silent?: boolean; full?: boolean }) => Promise<void>;
  selectedRows: TwofaAccount[];
  visibleRows: TwofaAccount[];
};

export function useTwofaQuotaDirectoryActions({
  applyQuotaResults,
  applyCockpitImport,
  syncFromCloud,
  selectedRows,
  visibleRows,
}: Deps) {
  const { pushToast } = useAppToast();
  const [probing, setProbing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stealthOpen, setStealthOpen] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const applyCockpitOutcome = useCallback(
    async (outcome: Awaited<ReturnType<typeof syncCockpitQuotaLocal>>) => {
      const changed = applyCockpitImport(outcome.patches);
      if ((outcome.created ?? 0) > 0) {
        await syncFromCloud({ silent: true, full: true });
      }
      pushToast(
        `Cockpit Cursor/Gemini: ${outcome.cockpitCount} found — updated ${changed}, created ${outcome.created ?? 0}`,
        changed > 0 || (outcome.created ?? 0) > 0 ? "success" : "info",
      );
    },
    [applyCockpitImport, pushToast, syncFromCloud],
  );

  const runProbe = useCallback(
    async (targets: TwofaAccount[]) => {
      if (!targets.length) return;
      if (!isQuotaProbeApiLikelyAvailable()) {
        pushToast("Live probe requires dev server (quota API auto-starts with pnpm dev)", "info");
        return;
      }
      setProbing(true);
      try {
        const results = await probeQuotaAccounts(
          targets.map((row) => ({
            id: row.id,
            service: row.service,
            password: row.password,
            note: row.note,
          })),
        );
        const changed = applyQuotaResults(results);
        pushToast(
          changed > 0 ? `Updated live quota for ${changed} account(s)` : "Probe finished — no changes",
          changed > 0 ? "success" : "info",
        );
      } catch (err) {
        pushToast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setProbing(false);
      }
    },
    [applyQuotaResults, pushToast],
  );

  const syncFromCockpit = useCallback(async () => {
    if (!isQuotaProbeApiLikelyAvailable()) {
      pushToast("Cockpit sync requires dev quota API (pnpm dev)", "info");
      return;
    }
    setSyncing(true);
    try {
      const outcome = await syncCockpitQuotaLocal();
      await applyCockpitOutcome(outcome);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSyncing(false);
    }
  }, [applyCockpitOutcome, pushToast]);

  const onImportBackupClick = useCallback(() => {
    backupInputRef.current?.click();
  }, []);

  const onBackupFile = useCallback(
    async (file: File) => {
      setSyncing(true);
      try {
        const text = await file.text();
        const backup = JSON.parse(text) as unknown;
        if (!isQuotaProbeApiLikelyAvailable()) {
          pushToast("Import backup via CLI: pnpm quota:cockpit:import --backup=path", "info");
          return;
        }
        const outcome = await importCockpitBackupJson(backup);
        await applyCockpitOutcome(outcome);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setSyncing(false);
      }
    },
    [applyCockpitOutcome, pushToast],
  );

  const refreshProbe = useCallback(() => {
    const targets = selectedRows.length ? selectedRows : visibleRows;
    void runProbe(targets);
  }, [runProbe, selectedRows, visibleRows]);

  return {
    probing,
    syncing,
    stealthOpen,
    setStealthOpen,
    backupInputRef,
    syncFromCockpit,
    refreshProbe,
    onImportBackupClick,
    onBackupFile,
  };
}
