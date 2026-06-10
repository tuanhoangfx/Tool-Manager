
import React, { useCallback, useState } from 'react';
import { useSettings } from "../../context/SettingsContext";
import { CheckIcon } from "../Icons";
import { TODO_HUB } from "../../styles/todo-hub-classes";

interface CopyIdButtonProps {
  id: number;
  isInline?: boolean;
}

const CopyIdButton: React.FC<CopyIdButtonProps> = ({ id, isInline = false }) => {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);
  
  const textToCopy = `#${id.toString().padStart(4, '0')}`;

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [textToCopy]);

  const buttonClass = copied ? TODO_HUB.idChipCopied : TODO_HUB.idChip;

  const button = (
    <button
      type="button"
      onClick={handleCopy}
      title={t.copyTaskId}
      className={buttonClass}
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <CheckIcon size={12} />
          Copied!
        </span>
      ) : (
        textToCopy
      )}
    </button>
  );

  if (isInline) {
    return (
        <span className="ml-1 inline-block align-middle">
           {button}
        </span>
    )
  }

  return button;
};

export default CopyIdButton;
