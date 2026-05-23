// @ts-nocheck

import React, { useState, useCallback } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { CheckIcon } from '@/components/Icons';

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

  const buttonClass = `font-mono text-xs font-semibold px-2 py-0.5 rounded-full transition-all duration-300 w-20 flex items-center justify-center
  ${copied
    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[var(--accent-color)] dark:hover:text-[var(--accent-color-dark)]'
  }`;

  const button = (
    <button
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
