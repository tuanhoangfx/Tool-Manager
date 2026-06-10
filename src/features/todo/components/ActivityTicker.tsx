
import React, { useState, useEffect } from 'react';
import { ClipboardListIcon, SpinnerIcon, CheckCircleIcon } from "@/todo/components/Icons";
import { useSettings } from "@/todo/context/SettingsContext";
import { supabase } from "@/todo/lib/supabase";
import type { Session } from '@supabase/supabase-js';
import { Task } from "@/todo/types";
import { TaskCounts } from "@/todo/app-types";
import AnimatedNumber from "@/todo/components/common/AnimatedNumber";
import TaskPreviewPopover from "@/todo/components/dashboard/TaskPreviewPopover";

interface ActivityTickerProps {
    session: Session | null;
    onEditTask: (task: Task | Partial<Task> | null) => void;
    onDeleteTask: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => void;
    taskCounts: TaskCounts;
}

const ActivityTicker: React.FC<ActivityTickerProps> = ({ session, onEditTask, onDeleteTask, onUpdateStatus, taskCounts }) => {
  const { t } = useSettings();
  const [activePreview, setActivePreview] = useState<Task['status'] | null>(null);
  const [previewTasks, setPreviewTasks] = useState<Task[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  useEffect(() => {
    if (!activePreview || !session) {
        setPreviewTasks([]);
        return;
    }
    const fetchPreviewTasks = async () => {
        setIsLoadingPreview(true);
        // This fetch is for the popover only and remains independent.
        // It fetches unfiltered tasks for the logged-in user for the selected status.
        // FIX: Explicitly use 'projects:project_id(*)' here as well
        const { data, error } = await supabase
            .from('tasks')
            .select('*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))')
            .or(`user_id.eq.${session.user.id},created_by.eq.${session.user.id}`)
            .eq('status', activePreview)
            .order('priority', { ascending: false });
        if (error) {
            console.error('Error fetching preview tasks:', error);
            setPreviewTasks([]);
        } else {
            setPreviewTasks(data as Task[]);
        }
        setIsLoadingPreview(false);
    };
    fetchPreviewTasks();
  }, [activePreview, session]);

  const handleStatClick = (status: Task['status']) => {
    setActivePreview(current => (current === status ? null : status));
  };
  
  const stats = [
    { label: t.tasksTodo, value: taskCounts.todo, icon: <ClipboardListIcon size={14} className="text-orange-500" />, status: 'todo' as Task['status'] },
    { label: t.tasksInProgress, value: taskCounts.inprogress, icon: <SpinnerIcon size={14} className="text-indigo-500 animate-spin" />, status: 'inprogress' as Task['status'] },
    { label: t.tasksDone, value: taskCounts.done, icon: <CheckCircleIcon size={14} className="text-green-500" />, status: 'done' as Task['status'] },
  ];

  const popoverTitle = activePreview === 'todo' ? t.tasksTodo : activePreview === 'inprogress' ? t.tasksInProgress : t.tasksDone;

  return (
    <>
        <div className="flex flex-wrap justify-center items-center gap-x-3 md:gap-x-4 gap-y-1 text-xs">
          {stats.map(stat => (
             <button 
                key={stat.label} 
                onClick={() => handleStatClick(stat.status)}
                className={`flex items-center gap-x-1.5 p-1 rounded-md transition-colors ${activePreview === stat.status ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                title={stat.label}
             >
                {stat.icon}
                <AnimatedNumber value={stat.value} />
                <span className="hidden lg:inline">{stat.label}</span>
            </button>
          ))}
        </div>
        <TaskPreviewPopover
            isOpen={!!activePreview}
            onClose={() => setActivePreview(null)}
            title={`${popoverTitle} (${previewTasks.length})`}
            tasks={previewTasks}
            isLoading={isLoadingPreview}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onUpdateStatus={onUpdateStatus}
        />
    </>
  );
};

export default React.memo(ActivityTicker);
