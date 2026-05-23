// @ts-nocheck

import React from 'react';
import { Task } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { ClipboardListIcon, SpinnerIcon, CheckCircleIcon, XCircleIcon } from '../Icons';

interface TaskStatusStepperProps {
  currentStatus: Task['status'];
  onStatusChange: (status: Task['status']) => void;
}

const TaskStatusStepper: React.FC<TaskStatusStepperProps> = ({ currentStatus, onStatusChange }) => {
  const { t } = useSettings();
  const statusOrder: Task['status'][] = ['todo', 'inprogress', 'done', 'cancelled'];
  
  const statusConfig: { [key in Task['status']]: { label: string; icon: React.FC<any>; color: string; } } = {
    todo: { label: t.todo, icon: ClipboardListIcon, color: 'text-orange-500 dark:text-orange-400' },
    inprogress: { label: t.inprogress, icon: SpinnerIcon, color: 'text-indigo-500 dark:text-indigo-400' },
    done: { label: t.done, icon: CheckCircleIcon, color: 'text-green-500 dark:text-green-400' },
    cancelled: { label: t.cancelled, icon: XCircleIcon, color: 'text-gray-500 dark:text-gray-400' },
  };

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="mb-3">
      <div className="relative flex p-1 bg-gray-100 dark:bg-gray-900/50 rounded-full">
        {/* The animated background "pill" */}
        <div
          className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-full shadow-md transition-all duration-300 ease-in-out"
          style={{
            width: `calc(25% - 0.25rem)`,
            left: `calc(${currentIndex * 25}% + 0.25rem)`,
          }}
        />
        {statusOrder.map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const isActive = status === currentStatus;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`relative z-10 w-1/4 flex-1 flex justify-center items-center gap-2 px-2 py-1.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
                isActive ? config.color : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-pressed={isActive}
            >
              <Icon size={16} className={status === 'inprogress' && isActive ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskStatusStepper;
