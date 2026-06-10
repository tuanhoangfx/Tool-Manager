
import React from 'react';
import { Task } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { ClipboardListIcon, SpinnerIcon, CheckCircleIcon, XCircleIcon } from '../Icons';
import { TODO_HUB } from '../../styles/todo-hub-classes';

interface TaskStatusStepperProps {
  currentStatus: Task['status'];
  onStatusChange: (status: Task['status']) => void;
}

const STATUS_MODIFIERS: Record<Task['status'], string> = {
  todo: 'todo-hub-status-btn--todo',
  inprogress: 'todo-hub-status-btn--inprogress',
  done: 'todo-hub-status-btn--done',
  cancelled: 'todo-hub-status-btn--cancelled',
};

const TaskStatusStepper: React.FC<TaskStatusStepperProps> = ({ currentStatus, onStatusChange }) => {
  const { t } = useSettings();
  const statusOrder: Task['status'][] = ['todo', 'inprogress', 'done', 'cancelled'];

  const statusConfig: { [key in Task['status']]: { label: string; icon: React.FC<{ size?: number; className?: string }> } } = {
    todo: { label: t.todo, icon: ClipboardListIcon },
    inprogress: { label: t.inprogress, icon: SpinnerIcon },
    done: { label: t.done, icon: CheckCircleIcon },
    cancelled: { label: t.cancelled, icon: XCircleIcon },
  };

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="mb-3">
      <div className={TODO_HUB.statusTrack}>
        <div
          className={TODO_HUB.statusPill}
          style={{
            width: 'calc(25% - 0.25rem)',
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
              className={`${TODO_HUB.statusBtn}${isActive ? ` todo-hub-status-btn--active ${STATUS_MODIFIERS[status]}` : ''}`}
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
