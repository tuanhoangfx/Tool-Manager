
import React, { useState, useEffect, useRef } from 'react';
import { Task, Profile } from "../types";
import { useSettings } from "../context/SettingsContext";
import { TrashIcon, ClockIcon, PlayIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, PaperclipIcon, ArrowRightIcon, ChatBubbleIcon } from "./Icons";
import PriorityIndicator from "./common/PriorityIndicator";
import Avatar from "./common/Avatar";
import { PROJECT_COLORS } from "../constants";
import { DataChange } from "../app-types";
import CopyIdButton from "./common/CopyIdButton";
import { useTaskStyles } from "../hooks/useTaskStyles";
import { useLiveDuration } from "../hooks/useLiveDuration";
import { supabase } from "../lib/supabase";
import { useToasts } from "../context/ToastContext";
import { useTodoUsers } from "../TodoUsersContext";
import { TodoHubBadge } from "./common/TodoHubBadge";
import { TODO_HUB } from "../styles/todo-hub-classes";

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => void;
    onBeginDrag: (taskId: number) => void;
    onEndDrag: () => void;
    isDragSource?: boolean;
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


const TaskCard: React.FC<TaskCardProps> = ({
    task,
    onEdit,
    onDelete,
    onUpdateStatus,
    onBeginDrag,
    onEndDrag,
    isDragSource = false,
    assignee,
    creator,
    lastDataChange,
}) => {
    const { t, timezone, language } = useSettings();
    const { addToast } = useToasts();
    const [isHighlighted, setIsHighlighted] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const allUsers = useTodoUsers();

    const styles = useTaskStyles(task);
    const frozenMs = styles.isArchived
        ? Math.max(0, new Date(task.updated_at).getTime() - new Date(task.created_at).getTime())
        : undefined;
    const duration = useLiveDuration(task.created_at, styles.liveDurationEnabled, frozenMs);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    useEffect(() => {
        if (lastDataChange && lastDataChange.type === 'update' && (lastDataChange.payload as Task).id === task.id) {
            // Check if the update was recent to avoid highlighting on stale re-renders
            if (Date.now() - lastDataChange.timestamp < 1500) {
                 setIsHighlighted(true);
                 const timer = setTimeout(() => setIsHighlighted(false), 450);
                 return () => clearTimeout(timer);
            }
        }
    }, [lastDataChange, task.id]);

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

    const dragState = useRef({ dragging: false, moved: false, x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent) => {
        dragState.current = { dragging: false, moved: false, x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (dragState.current.moved) return;
        const dx = Math.abs(e.clientX - dragState.current.x);
        const dy = Math.abs(e.clientY - dragState.current.y);
        if (dx > 6 || dy > 6) dragState.current.moved = true;
    };

    const handleCardClick = () => {
        if (dragState.current.moved || dragState.current.dragging) return;
        onEdit(task);
    };

    return (
        <div 
            className={`${styles.containerClassName} todo-hub-task-card--clickable${isDragSource ? ' todo-hub-task-card--drag-source' : ''}${isHighlighted ? ' todo-hub-task-card--highlight' : ''}`}
            draggable={!styles.isArchived}
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(task.id));
                dragState.current.dragging = true;
                onBeginDrag(task.id);
            }}
            onDragEnd={() => {
                dragState.current.dragging = false;
                onEndDrag();
                window.setTimeout(() => {
                    dragState.current.moved = false;
                }, 0);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
        >
            {/* Row 1: ID, Actions */}
            <div className="flex justify-between items-center gap-2">
                <CopyIdButton id={task.id} />
                
                <div 
                    className="flex items-center gap-0.5 flex-shrink-0"
                    draggable="false"
                    onClick={(e) => e.stopPropagation()}
                >
                    {!styles.isArchived && (
                        <>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'inprogress'); }} title={t.tasksInProgress} disabled={task.status === 'inprogress'} className={`${TODO_HUB.iconBtnPlay} disabled:cursor-not-allowed disabled:opacity-40`}><PlayIcon size={14}/></button>
                            {isMultiAssignee ? (
                                <button 
                                    type="button"
                                    onClick={handleMarkMyPartDone} 
                                    title={isMyPartDone ? "Mark incomplete" : "Mark done"}
                                    disabled={!myAssignment}
                                    className={`${isMyPartDone ? TODO_HUB.iconBtnDone : TODO_HUB.iconBtnPlay} disabled:cursor-not-allowed disabled:opacity-40`}
                                >
                                    <CheckCircleIcon size={14}/>
                                </button>
                            ) : (
                                <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'done'); }} title={t.tasksDone} className={TODO_HUB.iconBtnDone}><CheckCircleIcon size={14}/></button>
                            )}
                            <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateStatus(task, 'cancelled'); }} title={t.cancelTask} className={TODO_HUB.iconBtnCancel}><XCircleIcon size={14}/></button>
                        </>
                    )}
                    <button type="button" onClick={handleDeleteClick} className={TODO_HUB.iconBtnDanger} title={t.deleteTask}><TrashIcon size={14}/></button>
                </div>
            </div>
            
            {/* Row 2: Title */}
            <h4 className={styles.titleClassName}>
                {task.title}
                {isMultiAssignee && !styles.isArchived && (
                    <TodoHubBadge kind="count">{completedCount}/{assignees.length}</TodoHubBadge>
                )}
            </h4>

            {/* Row 3: Description */}
            {task.description && (
                <p className={styles.descriptionClassName}>{task.description}</p>
            )}

            {/* Row 4: Priority, Project (left) | Comments, Attachments, Assignee (right) */}
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <PriorityIndicator priority={task.priority} />
                    <TodoHubBadge
                      kind="project"
                      label={projectName}
                      color={projectColor}
                      extraCount={task.project_ids && task.project_ids.length > 1 ? task.project_ids.length - 1 : undefined}
                    />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {task.task_comments && task.task_comments.length > 0 && (
                        <TodoHubBadge kind="meta" title={`${task.task_comments.length} ${t.comments}`}>
                            <ChatBubbleIcon size={12} />
                            <span>{task.task_comments.length}</span>
                        </TodoHubBadge>
                    )}
                    {task.task_attachments && task.task_attachments.length > 0 && (
                        <TodoHubBadge kind="meta" title={`${task.task_attachments.length} ${t.attachments}`}>
                            <PaperclipIcon size={12} />
                            <span>{task.task_attachments.length}</span>
                        </TodoHubBadge>
                    )}
                    <div className="flex items-center gap-1.5">
                        {creator && (isMultiAssignee || creator.id !== assignee?.id) && (
                            <>
                                <Avatar user={creator} title={`${t.createdBy}: ${creator.full_name}`} size={20} />
                                <ArrowRightIcon size={12} className="text-[var(--muted)]" />
                            </>
                        )}
                        {isMultiAssignee ? (
                            <div className="flex -space-x-1.5">
                                {assignees.slice(0, 3).map((a, i) => {
                                    const assigneeProfile = allUsers.find(u => u.id === a.user_id) || { full_name: '?', avatar_url: null };
                                    return (
                                        <div key={i} className={`rounded-full ring-2 ${a.completed_at ? 'ring-green-500/70' : 'ring-[var(--panel)]'}`}>
                                            <Avatar user={assigneeProfile} title={assigneeProfile.full_name || 'Assignee'} size={20} />
                                        </div>
                                    );
                                })}
                                {assignees.length > 3 && (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold ring-2 ring-[var(--panel)]">+{assignees.length - 3}</div>
                                )}
                            </div>
                        ) : (
                            assignee && <Avatar user={assignee} title={`${t.assignee}: ${assignee.full_name}`} size={20} />
                        )}
                    </div>
                </div>
            </div>

            {/* Row 5: Creation/Completion Time, Total Logged Time, Due Date */}
            <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2 text-xs text-[var(--muted)]">
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
                    <div className={`${TODO_HUB.metaChip} font-mono text-[var(--text)]`} title={t.totalTimeLogged}>
                        <ClockIcon size={12} className={task.status === 'inprogress' ? 'text-sky-400' : ''}/>
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
