import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { HubToolDetailModal } from "@tool-workspace/hub-ui";
import { openQuotaStealthSession } from "./quota-api";

const DEFAULT_PROFILES = ["0012", "0021", "0069"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onOpened?: (profileName: string) => void;
};

export function QuotaStealthTestModal({ open, onClose, onOpened }: Props) {
  const [profileName, setProfileName] = useState<string>(DEFAULT_PROFILES[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfileName(DEFAULT_PROFILES[2]);
    setError(null);
  }, [open]);

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await openQuotaStealthSession(profileName);
      onOpened?.(profileName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <HubToolDetailModal
      open
      onClose={loading ? () => {} : onClose}
      ariaLabelledBy="quota-stealth-title"
      shellClassName="hub-header-panel-modal max-w-md"
      header={
        <div className="px-1">
          <h2 id="quota-stealth-title" className="text-sm font-semibold text-[var(--text)]">
            Stealth Cursor test
          </h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Opens cursor.com in a P0003 Stealth profile. After login, use Sync Cockpit to pull quota.
          </p>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-[var(--text)]">
        <label className="block text-[11px] text-[var(--muted)]">
          Profile
          <select
            className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-sm"
            value={profileName}
            disabled={loading}
            onChange={(e) => setProfileName(e.target.value)}
          >
            {DEFAULT_PROFILES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn text-[12px]" disabled={loading} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary text-[12px]" disabled={loading} onClick={() => void run()}>
            <Monitor size={14} className="mr-1 inline" />
            {loading ? "Opening…" : "Open Cursor"}
          </button>
        </div>
      </div>
    </HubToolDetailModal>
  );
}
