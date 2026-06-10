
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { XIcon, SpinnerIcon, SettingsIcon, ChevronRightIcon } from "@/todo/components/Icons";
import { useSettings } from "@/todo/context/SettingsContext";
import { Task, TaskAttachment, Profile, TaskComment, ProjectMember, Project, TaskAssignee } from "@/todo/types";
import { supabase } from "@/todo/lib/supabase";
import { useToasts } from "@/todo/context/ToastContext";

import TaskDetailsForm from "@/todo/components/task-modal/TaskDetailsForm";
import AttachmentSection from "@/todo/components/task-modal/AttachmentSection";
import CommentSection, { TempComment } from "@/todo/components/task-modal/CommentSection";
import TaskStatusStepper from "@/todo/components/task-modal/TaskStatusStepper";
import { TODO_HUB } from "@/todo/styles/todo-hub-classes";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>, newFiles: File[], deletedAttachmentIds: number[], newComments: string[]) => Promise<void>;
  task: Task | Partial<Task> | null;
  openedFrom?: string | null;
  allUsers: Profile[];
  currentUser: Profile | null;
  userProjects: ProjectMember[];
  onOpenDefaults: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task, openedFrom, allUsers, currentUser, userProjects, onOpenDefaults }) => {
  const { t, defaultDueDateOffset, timezone, defaultPriority } = useSettings();
  const { addToast } = useToasts();
  
  // Combined State for Form Data
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      status: 'todo' as Task['status'],
      priority: 'medium' as Task['priority'],
      dueDate: '',
      assigneeIds: [] as string[],
      projectIds: ['personal'] as string[]
  });

  // State for attachments
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);
  
  // State for comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [tempNewComments, setTempNewComments] = useState<TempComment[]>([]);
  const [optimisticComments, setOptimisticComments] = useState<TempComment[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  // Modal/logic state
  const [isSaving, setIsSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null | undefined>(undefined);
  const [validationError, setValidationError] = useState<'title' | 'assignee' | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Profile[]>(allUsers);

  const modalRef = useRef<HTMLDivElement>(null);
  
  const projectsForSelect = useMemo(() => userProjects.map(p => p.projects).filter((p): p is Project => p !== null), [userProjects]);

  const fetchComments = useCallback(async (taskId: number) => {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data as TaskComment[]);
    }
  }, []);
  
  useEffect(() => {
    if (isOpen) {
        const currentTaskId = task && 'id' in task ? task.id : null;
        if (currentTaskId !== editingTaskId) {
            if (task && 'id' in task) { // Editing existing task
                const assigneeIds = (task as Task).assignees?.map(a => a.user_id) || [];
                if (assigneeIds.length === 0 && task.user_id) {
                    assigneeIds.push(task.user_id);
                }

                const projectIds = (task as Task).project_ids?.map(String) || [];
                if (projectIds.length === 0 && task.project_id) {
                    projectIds.push(task.project_id.toString());
                }
                if (projectIds.length === 0) projectIds.push('personal');

                setFormData({
                    title: task.title || '',
                    description: task.description || '',
                    status: task.status || 'todo',
                    priority: task.priority || 'medium',
                    dueDate: task.due_date ? task.due_date.split('T')[0] : '',
                    assigneeIds: assigneeIds,
                    projectIds: projectIds
                });
                setAttachments(task.task_attachments || []);
                if (task && "id" in task && task.id != null) fetchComments(task.id);
                setTempNewComments([]);
                setOptimisticComments([]);
            } else { // New task
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + defaultDueDateOffset);
                const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
                const latestProject = userProjects.length > 0 ? userProjects[0] : null;
                const defaultProjectId = currentUser?.default_project_id?.toString() || latestProject?.project_id.toString() || 'personal';

                setFormData({
                    title: '',
                    description: '',
                    status: 'todo',
                    priority: defaultPriority,
                    dueDate: formatter.format(targetDate),
                    assigneeIds: task?.user_id ? [task.user_id] : (currentUser ? [currentUser.id] : []),
                    projectIds: [defaultProjectId]
                });
                
                setAttachments([]);
                setComments([]);
                setTempNewComments([]);
                setOptimisticComments([]);
            }
            setNewFiles([]);
            setDeletedAttachmentIds([]);
            setEditingTaskId(currentTaskId);
            setValidationError(null);
        }
    } else {
        if (editingTaskId !== undefined) {
             setEditingTaskId(undefined);
        }
    }
  }, [task, isOpen, defaultDueDateOffset, currentUser, fetchComments, editingTaskId, timezone, defaultPriority, userProjects]);
  
   useEffect(() => {
        if (!isOpen || !currentUser) return;
        setAssignableUsers(allUsers);
    }, [allUsers, currentUser, isOpen]);


  useEffect(() => {
    if (validationError === 'title' && formData.title.trim()) setValidationError(null);
    if (validationError === 'assignee' && formData.assigneeIds.length > 0) setValidationError(null);
  }, [formData.title, formData.assigneeIds, validationError]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.files;
    if (items) {
      const files = Array.from(items);
      if (files.length > 0) setNewFiles(prev => [...prev, ...files]);
    }
  }, []);

  useEffect(() => {
    const currentModalRef = modalRef.current;
    if (isOpen && currentModalRef) {
        currentModalRef.addEventListener('paste', handlePaste as EventListener);
        return () => currentModalRef.removeEventListener('paste', handlePaste as EventListener);
    }
  }, [isOpen, handlePaste]);
  
  const handlePostComment = async (content: string) => {
    if (!content.trim() || !currentUser) return;
    const isNewTask = !task || !('id' in task);
    
    if (isNewTask) {
        setTempNewComments(prev => [...prev, {
            id: `temp-${Date.now()}`,
            content: content,
            profiles: currentUser,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            task_id: 0,
        }]);
    } else {
        setIsPostingComment(true);
        const tempComment: TempComment = {
            id: `optimistic-${Date.now()}`,
            content: content,
            profiles: currentUser,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
            task_id: (task as Task).id,
            isSending: true,
        };
        setOptimisticComments(prev => [...prev, tempComment]);
        
        try {
            const { error } = await supabase.from('task_comments').insert({
                task_id: (task as Task).id,
                user_id: currentUser.id,
                content: content
            });
            if (error) throw error;
            
            // Refetch comments to get the real one from DB
            await fetchComments((task as Task).id);

        } catch (error: any) {
            console.error("Error posting comment:", error.message);
            addToast(`Error posting comment: ${error.message}`, 'error');
            // Remove optimistic comment on failure
            setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id));
        } finally {
            setIsPostingComment(false);
            setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id));
        }
    }
  };

  const handleSaveClick = async () => {
    if (!formData.title.trim()) {
      setValidationError('title');
      return;
    }
    if (formData.assigneeIds.length === 0) {
      setValidationError('assignee');
      return;
    }

    setIsSaving(true);
    
    const primaryUserId = formData.assigneeIds[0];
    const primaryProjectId = formData.projectIds.includes('personal') || formData.projectIds.length === 0 ? null : parseInt(formData.projectIds[0], 10);
    
    // Construct new assignees list preserving completion status if existing
    let newAssignees: TaskAssignee[] = [];
    if (task && 'assignees' in task && task.assignees) {
        const existingMap = new Map(task.assignees.map(a => [a.user_id, a]));
        newAssignees = formData.assigneeIds.map(id => {
            const existing = existingMap.get(id);
            return existing || { user_id: id, completed_at: null };
        });
    } else {
        newAssignees = formData.assigneeIds.map(id => ({ user_id: id, completed_at: null }));
    }

    const taskData: Partial<Task> = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.dueDate || null,
      user_id: primaryUserId, // Backward compatibility for RLS and simple queries
      project_id: primaryProjectId, // Backward compatibility
      project_ids: formData.projectIds.filter(id => id !== 'personal').map(Number),
      assignees: newAssignees
    };

    const newCommentContents = tempNewComments.map(c => c.content);

    await onSave(taskData, newFiles, deletedAttachmentIds, newCommentContents);
    setIsSaving(false);
  };
  
  if (!isOpen) return null;

  const combinedComments = [...comments, ...tempNewComments, ...optimisticComments];
  const taskIdDisplay = editingTaskId ? `#${editingTaskId.toString().padStart(4, '0')}` : '';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1010] flex justify-center overflow-y-auto p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div
        ref={modalRef}
        className={`${TODO_HUB.modalShell} max-w-6xl transform transition-all duration-300 ease-out animate-fadeInUp`}
        onClick={e => e.stopPropagation()}
      >
        <div className={TODO_HUB.modalHeader}>
          <div className="flex flex-col">
            {openedFrom && (
                <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    <span>{openedFrom}</span>
                    <ChevronRightIcon size={12} />
                    <span>{editingTaskId ? `Task ${taskIdDisplay}` : t.addNewTask}</span>
                </div>
            )}
            <h2 id="task-modal-title" className="text-xl font-bold text-[var(--text)]">
                {editingTaskId ? (openedFrom ? t.editTask : `${t.editTask} ${taskIdDisplay}`) : t.addNewTask}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onOpenDefaults}
                aria-label="Open task default settings"
                title="Task Defaults"
                className="rounded-full p-2 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
              >
              <SettingsIcon size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-[var(--muted)] transition-colors hover:text-[var(--text)]"
              aria-label={t.close}
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
            <div className="p-4 md:p-6">
                <TaskStatusStepper currentStatus={formData.status} onStatusChange={(s) => setFormData(prev => ({...prev, status: s}))} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-6">
                <div className="space-y-4">
                     <TaskDetailsForm
                        taskData={formData}
                        onFieldChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                        allUsers={assignableUsers}
                        userProjects={projectsForSelect}
                        validationError={validationError}
                    />
                    <AttachmentSection 
                        attachments={attachments} 
                        newFiles={newFiles}
                        onAddNewFiles={(files) => setNewFiles(prev => [...prev, ...files])}
                        onRemoveNewFile={(index) => setNewFiles(prev => prev.filter((_, i) => i !== index))}
                        onRemoveExistingAttachment={(id) => {
                            setDeletedAttachmentIds(prev => [...prev, id]);
                            setAttachments(prev => prev.filter(att => att.id !== id));
                        }}
                        isSaving={isSaving}
                    />
                </div>
                <div>
                  <CommentSection 
                      comments={combinedComments} 
                      onPostComment={handlePostComment}
                      isPostingComment={isPostingComment}
                  />
                </div>
            </div>
        </div>

        <div className={TODO_HUB.modalFooter}>
          <button type="button" onClick={onClose} className={TODO_HUB.btnSecondary}>{t.cancel}</button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="px-4 py-2 w-24 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-md shadow-md flex justify-center items-center disabled:opacity-50"
          >
            {isSaving ? <SpinnerIcon size={20} className="animate-spin" /> : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
