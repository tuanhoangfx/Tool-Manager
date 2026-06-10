
import React, { useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { TODO_HUB } from '../styles/todo-hub-classes';

export interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  children?: React.ReactNode;
  maxWidth?: string;
};

const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmButtonClass = 'bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)]',
  children,
  maxWidth = 'max-w-md',
}) => {
  const { t } = useSettings();

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
      onClose();
    }
  }, [onConfirm, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && onConfirm && !children) {
        event.preventDefault();
        handleConfirm();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm, children, handleConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1020] flex animate-fadeIn justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
    >
      <div
        className={`${TODO_HUB.modalShell} w-full ${maxWidth} transform transition-all duration-300 ease-out animate-fadeInUp`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative p-6">
          <h2 id="action-modal-title" className="text-xl font-bold text-[var(--text)]">{title}</h2>
          {message ? (
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">{message}</p>
          ) : null}
        </div>
        {children}
        {!children && (
          <div className={TODO_HUB.modalFooter}>
            {onConfirm && (
              <button type="button" onClick={onClose} className={TODO_HUB.btnSecondary}>
                {cancelText || t.cancel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm ? handleConfirm : onClose}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.02] focus:outline-none ${confirmButtonClass}`}
            >
              {onConfirm ? (confirmText || t.save) : t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionModal;
