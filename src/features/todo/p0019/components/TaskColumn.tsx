// @ts-nocheck

import React, { useRef } from 'react';
import { Task } from '../types';
import { useSettings } from '../context/SettingsContext';
import { type SortConfig } from '../lib/taskUtils';
import SortDropdown from './SortDropdown';
import TaskCard from './TaskCard';
import { TrashIcon } from './Icons';
import VirtualItem from './common/VirtualItem';
import { TaskCardSkeleton } from './Skeleton';
import { DataChange } from '@/App';

interface TaskColumnProps {
    status: Task['status'];
    title: string;
    icon: React.ReactNode;
    borderColor: string;
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
    borderColor,
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

    return (
        <div
            onDrop={() => onDrop(status)}
            onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
            onDragLeave={() => setDragOverStatus(null)}
            className={`bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 flex flex-col transition-colors duration-200 ${dragOverStatus === status ? 'bg-sky-100 dark:bg-sky-900/30' : ''}`}
        >
            <h3 className={`font-bold text-gray-700 dark:text-gray-300 px-2 pb-2 border-b-2 ${borderColor} flex-shrink-0 flex items-center justify-between gap-2`}>
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{title} ({tasks.length})</span>
                </div>
                <div className="flex items-center">
                    {status === 'cancelled' && tasks.length > 0 && onClearCancelledTasks && (
                        <button
                            onClick={() => onClearCancelledTasks(tasks)}
                            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
            <div ref={scrollContainerRef} className="mt-4 space-y-3 flex-grow overflow-y-auto">
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
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">{t.noTasksFound}</p>
                )}
            </div>
        </div>
    );
}

export default React.memo(TaskColumn);