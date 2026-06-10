import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { History, LayoutList } from "lucide-react";
import { HubDetailModal, TabButton } from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../../lib/ui-scale";
import { SpinnerIcon, ChevronRightIcon } from "./Icons";
import { useSettings } from "../context/SettingsContext";
import { Task, TaskAttachment, Profile, TaskComment, ProjectMember, Project, TaskAssignee } from "../types";
import { supabase } from "../lib/supabase";
import { useToasts } from "../context/ToastContext";
import { formatAbsoluteDateTime } from "../lib/taskUtils";
import { resolveTodoProfile } from "../todo-resolve-profile";
import Avatar from "./common/Avatar";

import TaskDetailsForm from "./task-modal/TaskDetailsForm";
import AttachmentSection from "./task-modal/AttachmentSection";
import CommentSection, { TempComment } from "./task-modal/CommentSection";
import TaskStatusStepper from "./task-modal/TaskStatusStepper";
import { TaskActivityLogPanel } from "./task-modal/TaskActivityLogPanel";

type TaskModalTab = "details" | "activity";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>, newFiles: File[], deletedAttachmentIds: number[], newComments: string[]) => Promise<void>;
  task: Task | Partial<Task> | null;
  openedFrom?: string | null;
  allUsers: Profile[];
  currentUser: Profile | null;
  userProjects: ProjectMember[];
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  task,
  openedFrom,
  allUsers,
  currentUser,
  userProjects,
}) => {
  const { t, defaultDueDateOffset, timezone, defaultPriority, language } = useSettings();
  const { addToast } = useToasts();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo" as Task["status"],
    priority: "medium" as Task["priority"],
    dueDate: "",
    assigneeIds: [] as string[],
    projectIds: ["personal"] as string[],
  });

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [tempNewComments, setTempNewComments] = useState<TempComment[]>([]);
  const [optimisticComments, setOptimisticComments] = useState<TempComment[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null | undefined>(undefined);
  const [validationError, setValidationError] = useState<"title" | "assignee" | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Profile[]>(allUsers);
  const [lastEditor, setLastEditor] = useState<{ profile: Profile; at: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TaskModalTab>("details");

  const modalRef = useRef<HTMLDivElement>(null);

  const projectsForSelect = useMemo(
    () => userProjects.map((p) => p.projects).filter((p): p is Project => p !== null),
    [userProjects],
  );

  const fetchComments = useCallback(async (taskId: number) => {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*, profiles:user_id(*)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setComments(data as TaskComment[]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
      const currentTaskId = task && "id" in task ? task.id : null;
      if (currentTaskId !== editingTaskId) {
        if (task && "id" in task) {
          const assigneeIds = (task as Task).assignees?.map((a) => a.user_id) || [];
          if (assigneeIds.length === 0 && task.user_id) assigneeIds.push(task.user_id);

          const projectIds = (task as Task).project_ids?.map(String) || [];
          if (projectIds.length === 0 && task.project_id) projectIds.push(task.project_id.toString());
          if (projectIds.length === 0) projectIds.push("personal");

          setFormData({
            title: task.title || "",
            description: task.description || "",
            status: task.status || "todo",
            priority: task.priority || "medium",
            dueDate: task.due_date ? task.due_date.split("T")[0] : "",
            assigneeIds,
            projectIds,
          });
          setAttachments(task.task_attachments || []);
          if (task.id != null) void fetchComments(task.id);
          setTempNewComments([]);
          setOptimisticComments([]);
        } else {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + defaultDueDateOffset);
          const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const latestProject = userProjects.length > 0 ? userProjects[0] : null;
          const defaultProjectId =
            currentUser?.default_project_id?.toString() ||
            latestProject?.project_id.toString() ||
            "personal";

          setFormData({
            title: "",
            description: "",
            status: "todo",
            priority: defaultPriority,
            dueDate: formatter.format(targetDate),
            assigneeIds: task?.user_id ? [task.user_id] : currentUser ? [currentUser.id] : [],
            projectIds: [defaultProjectId],
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
    } else if (editingTaskId !== undefined) {
      setEditingTaskId(undefined);
    }
  }, [
    task,
    isOpen,
    defaultDueDateOffset,
    currentUser,
    fetchComments,
    editingTaskId,
    timezone,
    defaultPriority,
    userProjects,
  ]);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setAssignableUsers(allUsers);
  }, [allUsers, currentUser, isOpen]);

  useEffect(() => {
    if (validationError === "title" && formData.title.trim()) setValidationError(null);
    if (validationError === "assignee" && formData.assigneeIds.length > 0) setValidationError(null);
  }, [formData.title, formData.assigneeIds, validationError]);

  useEffect(() => {
    if (!isOpen || editingTaskId == null) {
      setLastEditor(null);
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("created_at, user_id, profiles:user_id(*)")
        .eq("task_id", editingTaskId)
        .neq("action", "created_task")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        setLastEditor(null);
        return;
      }
      setLastEditor({
        profile: resolveTodoProfile(
          data.user_id,
          (Array.isArray(data.profiles) ? data.profiles[0] : data.profiles) as Profile | null,
          allUsers,
        ),
        at: data.created_at,
      });
    })();
  }, [isOpen, editingTaskId, allUsers]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.files;
    if (items) {
      const files = Array.from(items);
      if (files.length > 0) setNewFiles((prev) => [...prev, ...files]);
    }
  }, []);

  useEffect(() => {
    const currentModalRef = modalRef.current;
    if (isOpen && currentModalRef) {
      currentModalRef.addEventListener("paste", handlePaste as EventListener);
      return () => currentModalRef.removeEventListener("paste", handlePaste as EventListener);
    }
  }, [isOpen, handlePaste]);

  const handlePostComment = async (content: string) => {
    if (!content.trim() || !currentUser) return;
    const isNewTask = !task || !("id" in task);

    if (isNewTask) {
      setTempNewComments((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          content,
          profiles: currentUser,
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
          task_id: 0,
        },
      ]);
    } else {
      setIsPostingComment(true);
      const tempComment: TempComment = {
        id: `optimistic-${Date.now()}`,
        content,
        profiles: currentUser,
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        task_id: (task as Task).id,
        isSending: true,
      };
      setOptimisticComments((prev) => [...prev, tempComment]);

      try {
        const { error } = await supabase.from("task_comments").insert({
          task_id: (task as Task).id,
          user_id: currentUser.id,
          content,
        });
        if (error) throw error;
        await fetchComments((task as Task).id);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        addToast(`Error posting comment: ${msg}`, "error");
        setOptimisticComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      } finally {
        setIsPostingComment(false);
        setOptimisticComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      }
    }
  };

  const handleSaveClick = async () => {
    if (!formData.title.trim()) {
      setValidationError("title");
      return;
    }
    if (formData.assigneeIds.length === 0) {
      setValidationError("assignee");
      return;
    }

    setIsSaving(true);

    const primaryUserId = formData.assigneeIds[0];
    const primaryProjectId =
      formData.projectIds.includes("personal") || formData.projectIds.length === 0
        ? null
        : parseInt(formData.projectIds[0], 10);

    let newAssignees: TaskAssignee[] = [];
    if (task && "assignees" in task && task.assignees) {
      const existingMap = new Map(task.assignees.map((a) => [a.user_id, a]));
      newAssignees = formData.assigneeIds.map((id) => existingMap.get(id) || { user_id: id, completed_at: null });
    } else {
      newAssignees = formData.assigneeIds.map((id) => ({ user_id: id, completed_at: null }));
    }

    const taskData: Partial<Task> = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.dueDate || null,
      user_id: primaryUserId,
      project_id: primaryProjectId,
      project_ids: formData.projectIds.filter((id) => id !== "personal").map(Number),
      assignees: newAssignees,
    };

    await onSave(taskData, newFiles, deletedAttachmentIds, tempNewComments.map((c) => c.content));
    setIsSaving(false);
  };

  const combinedComments = [...comments, ...tempNewComments, ...optimisticComments];
  const taskIdDisplay = editingTaskId ? `#${editingTaskId.toString().padStart(4, "0")}` : "";

  const taskRecord = task && "id" in task ? (task as Task) : null;
  const creatorProfile = taskRecord
    ? resolveTodoProfile(taskRecord.created_by, taskRecord.creator, allUsers)
    : currentUser;
  const createdLabel = taskRecord?.created_at
    ? formatAbsoluteDateTime(taskRecord.created_at, language, timezone)
    : null;
  const updatedLabel = taskRecord?.updated_at
    ? formatAbsoluteDateTime(taskRecord.updated_at, language, timezone)
    : null;

  const showLastEditor =
    lastEditor &&
    (lastEditor.profile.id !== creatorProfile?.id ||
      (updatedLabel && createdLabel && updatedLabel !== createdLabel));

  return (
    <HubDetailModal
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="task-modal-title"
      shellClassName="w-full max-w-6xl"
      header={
        <div className="user-access-modal__header">
          <div className="user-access-modal__header-main min-w-0 flex-nowrap items-center gap-2">
            {openedFrom ? (
              <>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  {openedFrom}
                </span>
                <ChevronRightIcon size={12} className="shrink-0 opacity-50" aria-hidden />
              </>
            ) : null}
            <h2 id="task-modal-title" className="min-w-0 truncate text-lg font-bold text-[var(--text)]">
              {editingTaskId ? (openedFrom ? t.editTask : `${t.editTask} ${taskIdDisplay}`) : t.addNewTask}
            </h2>
            {taskRecord && creatorProfile ? (
              <>
                <span className="hidden shrink-0 text-[var(--muted)] md:inline" aria-hidden>
                  ·
                </span>
                <div className="hidden min-w-0 items-center gap-1.5 truncate text-xs text-[var(--muted)] md:flex">
                  <Avatar user={creatorProfile} title={creatorProfile.full_name || ""} size={18} />
                  <span className="truncate">
                    {t.createdBy}{" "}
                    <span className="text-[var(--text)]">
                      {creatorProfile.full_name || creatorProfile.email}
                    </span>
                    {createdLabel ? ` · ${createdLabel}` : ""}
                  </span>
                </div>
                {showLastEditor && lastEditor ? (
                  <>
                    <span className="hidden shrink-0 text-[var(--muted)] lg:inline" aria-hidden>
                      ·
                    </span>
                    <span
                      className="hidden min-w-0 truncate text-xs text-[var(--muted)] lg:inline"
                      title={formatAbsoluteDateTime(lastEditor.at, language, timezone)}
                    >
                      {t.lastEditedBy}{" "}
                      <span className="text-[var(--text)]">
                        {lastEditor.profile.full_name || lastEditor.profile.email}
                      </span>
                    </span>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      }
      footer={
        <div className="hub-tool-detail-modal__footer">
          <div className="hub-tool-detail-modal__footer-inner !justify-end">
            <button type="button" onClick={onClose} className="hub-tool-detail-modal__secondary">
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveClick()}
              disabled={isSaving}
              className="hub-tool-detail-modal__confirm min-w-[7rem]"
            >
              {isSaving ? <SpinnerIcon size={18} className="hub-tool-detail-modal__confirm-icon--busy" /> : t.save}
            </button>
          </div>
        </div>
      }
    >
      <div ref={modalRef} className="modal-shell__scroll flex min-h-0 flex-1 flex-col">
        {editingTaskId ? (
          <div className="border-b border-white/5 px-4 pt-3 md:px-6">
            <div className="flex gap-1">
              <TabButton
                active={activeTab === "details"}
                onClick={() => setActiveTab("details")}
                icon={<LayoutList size={compactIconSize(12)} aria-hidden />}
              >
                Details
              </TabButton>
              <TabButton
                active={activeTab === "activity"}
                onClick={() => setActiveTab("activity")}
                icon={<History size={compactIconSize(12)} aria-hidden />}
              >
                {t.activityLog}
              </TabButton>
            </div>
          </div>
        ) : null}

        {activeTab === "activity" && editingTaskId ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            <TaskActivityLogPanel taskId={editingTaskId} />
          </div>
        ) : (
          <>
            <div className="p-4 md:p-6">
              <TaskStatusStepper
                currentStatus={formData.status}
                onStatusChange={(s) => setFormData((prev) => ({ ...prev, status: s }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 px-4 pb-6 md:grid-cols-2 md:px-6">
              <div className="space-y-4">
                <TaskDetailsForm
                  taskData={formData}
                  onFieldChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
                  allUsers={assignableUsers}
                  userProjects={projectsForSelect}
                  validationError={validationError}
                />
                <AttachmentSection
                  attachments={attachments}
                  newFiles={newFiles}
                  onAddNewFiles={(files) => setNewFiles((prev) => [...prev, ...files])}
                  onRemoveNewFile={(index) => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                  onRemoveExistingAttachment={(id) => {
                    setDeletedAttachmentIds((prev) => [...prev, id]);
                    setAttachments((prev) => prev.filter((att) => att.id !== id));
                  }}
                  isSaving={isSaving}
                />
              </div>
              <div>
                <CommentSection
                  comments={combinedComments}
                  onPostComment={handlePostComment}
                  isPostingComment={isPostingComment}
                  allUsers={allUsers}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </HubDetailModal>
  );
};

export default TaskModal;
