import React, { useRef, useEffect } from 'react';
import { XIcon, SpinnerIcon } from '../Icons';
import { useSettings } from '../../context/SettingsContext';
import { Task } from '../../types';
import TaskCard from '../TaskCard';


interface TaskPreviewPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    tasks: Task[];
    isLoading: boolean;
    onEditTask: (task: Task | Partial<Task> | null) => void;
    onDeleteTask: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => void;
}

const TaskPreviewPopover: React.FC<TaskPreviewPopoverProps> = ({ isOpen, onClose, title, tasks, isLoading, onEditTask, onDeleteTask, onUpdateStatus }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const { t } = useSettings();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[998] flex items-start justify-center pt-10" aria-hidden="true" onClick={onClose}>
            <div 
                ref={popoverRef}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-4xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-fadeInDown overflow-hidden flex flex-col max-h-[60vh]"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t.close}>
                        <XIcon size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <SpinnerIcon size={32} className="animate-spin text-[var(--accent-color)]" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">{t.noTasksFound}</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {tasks.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onEdit={onEditTask} 
                                    onDelete={onDeleteTask} 
                                    onUpdateStatus={onUpdateStatus} 
                                    onDragStart={() => {}}
                                    assignee={task.assignee}
                                    creator={task.creator}
                                    // FIX: Add missing lastDataChange prop, set to null as this component doesn't track it.
                                    lastDataChange={null}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskPreviewPopover;