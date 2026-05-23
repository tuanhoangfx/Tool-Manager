// @ts-nocheck

import React, { useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

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
      // Chỉ kích hoạt khi nhấn 'Enter' nếu đó là một modal xác nhận đơn giản (không có children)
      // và có một hành động xác nhận tồn tại. Điều này tránh xung đột với các modal có form.
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1020] flex justify-center overflow-y-auto p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidth} transform transition-all duration-300 ease-out animate-fadeInUp my-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 relative">
          <h2 id="action-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          {message && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{message}</p>}
        </div>
        {children}
        {!children && (
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl">
            {onConfirm && (
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors">
                {cancelText || t.cancel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm ? handleConfirm : onClose}
              className={`px-4 py-2 text-sm font-semibold text-white ${confirmButtonClass} rounded-md shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none`}
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
