// @ts-nocheck
import React from 'react';
import { useToasts } from '../context/ToastContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts } = useToasts();

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[1000] space-y-2 flex flex-col items-center">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;