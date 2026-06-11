
import React, { useRef } from 'react';
import { Task } from '../types';
import { useSettings } from '../context/SettingsContext';
import { type SortConfig } from '../lib/taskUtils';
import SortDropdown from './SortDropdown';
import TaskCard from './TaskCard';
import { TrashIcon } from './Icons';
import VirtualItem from './common/VirtualItem';
import { TaskCardSkeleton } from './Skeleton';
import { DataChange } from "../app-types";
import { TODO_HUB } from '../styles/todo-hub-classes';

interface TaskColumnProps {
    status: Task['status'];
    title: string;
    icon: React.ReactNode;
    tasks: Task[];
    sortConfig: SortConfig;
    dragOverStatus: Task['status'] | null;
    lastDataChange: DataChange | null;
    onDrop: (status: Task['status']) => void;
    setDragOverStatus: (status: Task['status'] | null) => void;
    setDraggedTaskId: (taskId: number | null) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => Promise<boolean>;
    onSortChange: (newConfig: SortConfig) => void;
    onClearCancelledTasks?: (tasks: Task[]) => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({
    status,
    title,
    icon,
    tasks,
    sortConfig,
    dragOverStatus,
    lastDataChange,
    onDrop,
    setDragOverStatus,
    setDraggedTaskId,
    onEditTask,
    onDeleteTask,
    onUpdateStatus,
    onSortChange,
    onClearCancelledTasks,
}) => {
    const { t } = useSettings();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isDragOver = dragOverStatus === status;

    return (
        <div
            onDrop={() => onDrop(status)}
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
            onDragLeave={() => setDragOverStatus(null)}
            className={`${TODO_HUB.taskColumn} todo-hub-column--${status} ${isDragOver ? 'todo-hub-column--drag-over' : ''}`}
        >
            <h3 className={`todo-hub-column__header todo-hub-column__header--${status}`}>
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title} ({tasks.length})</span>
                </div>
                <div className="flex items-center">
                    {status === 'cancelled' && tasks.length > 0 && onClearCancelledTasks && (
                        <button
                            type="button"
                            onClick={() => onClearCancelledTasks(tasks)}
                            className={`${TODO_HUB.iconBtn} todo-hub-icon-btn--danger`}
                            title={t.clearCancelledTasksTitle}
                        >
                            <TrashIcon size={14} />
                        </button>
                    )}
                    <SortDropdown
                        status={status}
                        config={sortConfig}
                        onChange={onSortChange}
                    />
                </div>
            </h3>
            <div ref={scrollContainerRef} className="todo-hub-column__scroll space-y-3">
                {tasks.map(task => (
                    <VirtualItem key={task.id} placeholder={<TaskCardSkeleton />} rootRef={scrollContainerRef}>
                        <TaskCard
                            task={task}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            onUpdateStatus={onUpdateStatus}
                            onDragStart={setDraggedTaskId}
                            assignee={task.assignee}
                            creator={task.creator}
                            lastDataChange={lastDataChange}
                        />
                    </VirtualItem>
                ))}
                {tasks.length === 0 && (
                    <p className="p-4 text-center text-sm text-[var(--muted)]">{t.noTasksFound}</p>
                )}
            </div>
        </div>
    );
}

export default React.memo(TaskColumn);
