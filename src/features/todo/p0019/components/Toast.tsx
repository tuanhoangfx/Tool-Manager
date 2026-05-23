// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useToasts } from '../context/ToastContext';
import type { Toast as ToastType } from '../context/ToastContext';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './Icons';

interface ToastProps {
  toast: ToastType;
}

const toastIcons: { [key in ToastType['type']]: React.FC<any> } = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
};

const toastColors: { [key in ToastType['type']]: string } = {
  success: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
  error: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
};

const iconColors: { [key in ToastType['type']]: string } = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { removeToast } = useToasts();
  const [isExiting, setIsExiting] = useState(false);
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 3000); // Auto-dismiss after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, toast.id, removeToast]);
  
  const animationClass = isExiting ? 'animate-fadeOutUp' : 'animate-fadeInDown';

  return (
    <div className={`rounded-full shadow-lg px-4 py-2 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg ${toastColors[toast.type]} ${animationClass}`}>
      <Icon size={18} className={iconColors[toast.type]} />
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
};

export default Toast;