import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />
);

export const TaskCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-900/70 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-2/3 mt-1" />
        <div className="flex flex-wrap justify-between items-center mt-2 gap-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-1.5">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-12" />
        </div>
    </div>
);

export const TaskBoardSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[60vh]">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 flex flex-col">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <div className="space-y-3">
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                </div>
            </div>
        ))}
    </div>
);

export const EmployeeListSkeleton: React.FC = () => (
    <ul className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 flex-grow" />
            </li>
        ))}
    </ul>
);

export const ActivityLogItemSkeleton: React.FC = () => (
    <div className="flex items-start gap-3 p-1">
        <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
        <div className="flex-grow">
            <Skeleton className="h-4 w-3/4 mb-1.5" />
            <Skeleton className="h-3 w-1/4" />
        </div>
    </div>
);