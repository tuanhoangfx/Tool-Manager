// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { Task, Profile } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { TrashIcon, EditIcon, ClockIcon, PlayIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, PaperclipIcon, ArrowRightIcon, ChatBubbleIcon } from '@/components/Icons';
import PriorityIndicator from '@/components/common/PriorityIndicator';
import Avatar from '@/components/common/Avatar';
import { PROJECT_COLORS } from '@/constants';
import { DataChange } from '@/App';
import CopyIdButton from '@/components/common/CopyIdButton';
import { useTaskStyles } from '@/hooks/useTaskStyles';
import { supabase } from '@/lib/supabase';
import { useToasts } from '@/context/ToastContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => void;
    onDragStart: (taskId: number) => void;
    assignee?: Profile | null;
    creator?: Profile | null;
    lastDataChange: DataChange | null;
}

const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatExactTime = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: timezone,
        hour12: false,
    };
    const formatted = new Intl.DateTimeFormat('vi-VN', options).format(date);
    const parts = formatted.split(', ');
    if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
    }
    return formatted; // Fallback
};

const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    };
    return new Intl.DateTimeFormat('vi-VN', options).format(date);
};


const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onUpdateStatus, onDragStart, assignee, creator, lastDataChange }) => {
    const { t, timezone, language } = useSettings();
    const { addToast } = useToasts();
    const [duration, setDuration] = useState(0);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [allUsers] = useLocalStorage<Profile[]>('all_users', []);

    // Use the custom hook for all style logic
    const styles = useTaskStyles(task);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    useEffect(() => {
        if (lastDataChange && lastDataChange.type === 'update' && lastDataChange.payload.id === task.id) {
            // Check if the update was recent to avoid highlighting on stale re-renders
            if (Date.now() - lastDataChange.timestamp < 1500) {
                 setIsHighlighted(true);
                 const timer = setTimeout(() => setIsHighlighted(false), 1500); // Match animation duration
                 return () => clearTimeout(timer);
            }
        }
    }, [lastDataChange, task.id]);

    useEffect(() => {
        let interval: number | undefined;

        if (styles.isArchived) {
            const start = new Date(task.created_at).getTime();
            const end = new Date(task.updated_at).getTime();
            setDuration(Math.max(0, end - start));
            if (interval) clearInterval(interval);
        } else {
            const start = new Date(task.created_at).getTime();
            const updateDuration = () => {
                setDuration(Date.now() - start);
            };
            updateDuration();
            interval = window.setInterval(updateDuration, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [task.created_at, task.updated_at, styles.isArchived]);
    
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(task);
    };
    
    const projectData = task.projects;
    const project = Array.isArray(projectData) ? projectData[0] : projectData;
    
    const projectName = project ? project.name : t.personalProject;
    const projectColor = project ? (project.color || PROJECT_COLORS[project.id % PROJECT_COLORS.length]) : '#6b7280';

    // Logic for multiple assignees status
    const assignees = task.assignees || [];
    const isMultiAssignee = assignees.length > 1;
    const completedCount = assignees.filter(a => a.completed_at).length;
    const isAllCompleted = assignees.length > 0 && completedCount === assignees.length;
    
    // Check if current user is an assignee and has completed their part
    const myAssignment = currentUser ? assignees.find(a => a.user_id === currentUser.id) : null;
    const isMyPartDone = myAssignment?.completed_at;

    const handleMarkMyPartDone = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser || !myAssignment) return;

        const newCompletedAt = isMyPartDone ? null : new Date().toISOString();
        const updatedAssignees = assignees.map(a => 
            a.user_id === currentUser.id ? { ...a, completed_at: newCompletedAt } : a
        );

        // Determine if all are done now
        const allDone = updatedAssignees.every(a => !!a.completed_at);
        const newStatus = allDone ? 'done' : (task.status === 'done' ? 'inprogress' : task.status);

        const { error } = await supabase.from('tasks').update({
            assignees: updatedAssignees,
            status: newStatus
        }).eq('id', task.id);

        if (error) {
            addToast("Failed to update status", "error");
        } else {
            addToast(newCompletedAt ? "Marked as done" : "Marked as incomplete", "success");
            
            // Send Notification to other assignees and creator
            if (newCompletedAt) {
                const recipients = new Set<string>();
                if (task.created_by && task.created_by !== currentUser.id) recipients.add(task.created_by);
                assignees.forEach(a => {
                    if (a.user_id !== currentUser.id) recipients.add(a.user_id);
                });

                if (recipients.size > 0) {
                    const newCount = updatedAssignees.filter(a => a.completed_at).length;
                    const notifications = Array.from(recipients).map(uid => ({
                        user_id: uid,
                        actor_id: currentUser.id,
                        type: 'task_part_completed',
                        data: {
                            task_id: task.id,
                            task_title: task.title,
                            actor_name: currentUser.user_metadata?.full_name || currentUser.email,
                            completed_count: newCount,
                            total_count: updatedAssignees.length
                        }
                    }));
                    await supabase.from('notifications').insert(notifications);
                }
            }
        }
    };

    return (
        <div 
            className={`${styles.containerClassName} ${isHighlighted ? 'animate-highlight-update' : ''}`}
            draggable={!styles.isArchived}
            onDragStart={() => onDragStart(task.id)}
        >
            {/* Row 1: ID, Actions */}
            <div className="flex justify-between items-center gap-2">
                <CopyIdButton id={task.id} />
                
                <div 
                    className="flex items-center gap-0.5 flex-shrink-0"
                    draggable="false"
                >
                    <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" title={t.editTask}><EditIcon size={14}/></button>
                    {!styles.isArchived && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'inprogress'); }} title={t.tasksInProgress} disabled={task.status === 'inprogress'} className="p-1.5 rounded-full text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed"><PlayIcon size={14}/></button>
                            {isMultiAssignee ? (
                                <button 
                                    onClick={handleMarkMyPartDone} 
                                    title={isMyPartDone ? "Mark incomplete" : "Mark done"}
                                    disabled={!myAssignment}
                                    className={`p-1.5 rounded-full transition-all duration-300
                                        ${isMyPartDone 
                                            ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10'
                                        }
                                    `}
                                >
                                    <CheckCircleIcon size={14}/>
                                </button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'done'); }} title={t.tasksDone} className="p-1.5 rounded-full text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"><CheckCircleIcon size={14}/></button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'cancelled'); }} title={t.cancelTask} className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><XCircleIcon size={14}/></button>
                        </>
                    )}
                    <button onClick={handleDeleteClick} className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" title={t.deleteTask}><TrashIcon size={14}/></button>
                </div>
            </div>
            
            {/* Row 2: Title */}
            <h4 className={styles.titleClassName}>
                {task.title}
                {isMultiAssignee && !styles.isArchived && (
                    <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                        {completedCount}/{assignees.length}
                    </span>
                )}
            </h4>

            {/* Row 3: Description */}
            {task.description && (
                <p className={styles.descriptionClassName}>{task.description}</p>
            )}

            {/* Row 4: Priority, Project (left) | Comments, Attachments, Assignee (right) */}
            <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <PriorityIndicator priority={task.priority} />
                    <div title={projectName} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: projectColor }}></span>
                        {task.project_ids && task.project_ids.length > 1 && <span className="font-bold text-[10px] bg-gray-200 dark:bg-gray-700 rounded-full px-1">+{task.project_ids.length - 1}</span>}
                        <span className="truncate max-w-[100px]">{projectName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {task.task_comments && task.task_comments.length > 0 && (
                        <div title={`${task.task_comments.length} ${t.comments}`} className="flex items-center gap-1">
                            <ChatBubbleIcon size={12} />
                            <span>{task.task_comments.length}</span>
                        </div>
                    )}
                    {task.task_attachments && task.task_attachments.length > 0 && (
                        <div title={`${task.task_attachments.length} ${t.attachments}`} className="flex items-center gap-1">
                            <PaperclipIcon size={12} />
                            <span>{task.task_attachments.length}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        {creator && (isMultiAssignee || creator.id !== assignee?.id) && (
                            <>
                                <Avatar user={creator} title={`${t.createdBy}: ${creator.full_name}`} size={20} />
                                <ArrowRightIcon size={12} className="text-gray-400" />
                            </>
                        )}
                        {isMultiAssignee ? (
                            <div className="flex -space-x-1.5">
                                {assignees.slice(0, 3).map((a, i) => {
                                    const assigneeProfile = allUsers.find(u => u.id === a.user_id) || { full_name: '?', avatar_url: null };
                                    return (
                                        <div key={i} className={`rounded-full ring-2 ${a.completed_at ? 'ring-green-500' : 'ring-white dark:ring-gray-800'}`}>
                                            <Avatar user={assigneeProfile} title={assigneeProfile.full_name || 'Assignee'} size={20} />
                                        </div>
                                    );
                                })}
                                {assignees.length > 3 && (
                                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center text-[8px] font-bold">+{assignees.length - 3}</div>
                                )}
                            </div>
                        ) : (
                            assignee && <Avatar user={assignee} title={`${t.assignee}: ${assignee.full_name}`} size={20} />
                        )}
                    </div>
                </div>
            </div>

            {/* Row 5: Creation/Completion Time, Total Logged Time, Due Date */}
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700/50 pt-2 mt-1">
                {styles.isArchived ? (
                    <span className="tabular-nums flex items-center gap-1" title={t.completionDate}>
                        {styles.isDone ? (
                            <span className="text-sm" role="img" aria-label="flag">🚩</span>
                        ) : ( 
                            <span className="text-sm" role="img" aria-label="prohibited">🚫</span>
                        )}
                        {formatExactTime(task.updated_at, timezone)}
                    </span>
                ) : (
                    <span className="tabular-nums flex items-center gap-1" title={t.creationTime}>
                        <span role="img" aria-label="rocket" className="text-sm">🚀</span>
                        {formatExactTime(task.created_at, timezone)}
                    </span>
                )}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-gray-600 dark:text-gray-300" title={t.totalTimeLogged}>
                        <ClockIcon size={12} className={task.status === 'inprogress' ? 'text-sky-500' : ''}/>
                        <span>{formatDuration(duration)}</span>
                    </div>
                    {task.due_date && (
                        <div title={t.dueDateLabel} className={styles.dueDateClassName}>
                            {styles.isOverdue ? (
                                <span className="animate-gentle-shake text-sm">⏰</span>
                            ) : styles.isToday ? (
                                <span className="animate-gentle-shake text-sm">🔥</span>
                            ) : (
                                <CalendarIcon size={12} />
                            )}
                            <span>{formatShortDate(task.due_date)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(TaskCard);
