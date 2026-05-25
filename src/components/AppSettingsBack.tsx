import { ArrowLeft } from "lucide-react";

type Props = {
  appLabel: string;
  onBack: () => void;
};

export function AppSettingsBack({ appLabel, onBack }: Props) {
  return (
    <button type="button" onClick={onBack} className="btn-ghost btn mb-4 inline-flex gap-1.5 text-[12px]">
      <ArrowLeft size={14} />
      Back to {appLabel}
    </button>
  );
}
