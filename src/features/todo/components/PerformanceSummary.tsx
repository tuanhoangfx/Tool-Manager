


import React from 'react';
import { Task } from "@/todo/types";
import { useSettings } from "@/todo/context/SettingsContext";
import { ClipboardListIcon, SpinnerIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@/todo/components/Icons";
import StatCard from "@/todo/components/performance-summary/StatCard";

// FIX: Define and export the TimeRange type to resolve import errors.
export type TimeRange = 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'customMonth' | 'customRange' | 'last30Days';

interface PerformanceSummaryProps {
  title: string;
  tasks: Task[];
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({
  title,
  tasks,
}) => {
  const { t } = useSettings();
  
  const stats = React.useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      done: tasks.filter(t => t.status === 'done').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }, [tasks]);

  const avgCompletionTime = React.useMemo(() => {
      const doneTasks = tasks.filter(t => t.status === 'done');
      if (doneTasks.length === 0) return 'N/A';
      
      const totalTime = doneTasks.reduce((acc, task) => {
          const created = new Date(task.created_at).getTime();
          const completed = new Date(task.updated_at).getTime();
          return acc + (completed - created);
      }, 0);

      const avgTimeMs = totalTime / doneTasks.length;
      if (avgTimeMs < 0) return 'N/A';
      
      const days = Math.floor(avgTimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((avgTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((avgTimeMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;

  }, [tasks]);
  
  return (
      <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={<ClipboardListIcon className="text-blue-500" />} label={t.totalTasks} value={stats.total} />
              <StatCard icon={<ClipboardListIcon className="text-orange-500" />} label={t.todo} value={stats.todo} />
              <StatCard icon={<SpinnerIcon className="text-indigo-500 animate-spin"/>} label={t.inprogress} value={stats.inprogress} />
              <StatCard icon={<CheckCircleIcon className="text-green-500" />} label={t.done} value={stats.done} />
              <StatCard icon={<XCircleIcon className="text-gray-500" />} label={t.cancelled} value={stats.cancelled} />
              <StatCard icon={<ClockIcon className="text-purple-500" />} label={t.avgCompletionTime} value={avgCompletionTime} />
          </div>
      </div>
  );
};

export default React.memo(PerformanceSummary);