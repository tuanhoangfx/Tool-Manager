
import React from 'react';
import { Task } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { TodoKanbanStatusIcon } from '../../todo-kanban-status';
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

  const statusConfig: { [key in Task['status']]: { label: string } } = {
    todo: { label: t.todo },
    inprogress: { label: t.inprogress },
    done: { label: t.done },
    cancelled: { label: t.cancelled },
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
          const isActive = status === currentStatus;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`${TODO_HUB.statusBtn}${isActive ? ` todo-hub-status-btn--active ${STATUS_MODIFIERS[status]}` : ''}`}
              aria-pressed={isActive}
            >
              <TodoKanbanStatusIcon status={status} size={16} />
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskStatusStepper;
