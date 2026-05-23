// @ts-nocheck


import React, { useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSettings } from '../../../context/SettingsContext';
import { useToasts } from '../../../context/ToastContext';
import { Project, Profile } from '../../../types';
import { PlusIcon, EditIcon, TrashIcon, SpinnerIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from '../../Icons';
import { useModalManager } from '../../../hooks/useModalManager';
import { formatAbsoluteDateTime } from '../../../lib/taskUtils';

interface ProjectManagementDashboardProps {
    onEditProject: (project: Project | null) => void;
    projects: Project[];
    loadingProjects: boolean;
    onProjectsChange: () => void;
    currentUserProfile: Profile | null;
}

type SortKey = keyof Project | 'members';

const SortableHeader: React.FC<{
    sortKey: SortKey;
    currentSort: { key: SortKey; direction: 'asc' | 'desc' };
    setSort: (sort: { key: SortKey; direction: 'asc' | 'desc' }) => void;
    className?: string;
    children: React.ReactNode;
}> = ({ children, sortKey, currentSort, setSort, className }) => {
    const isSorting = currentSort.key === sortKey;
    const direction = isSorting ? currentSort.direction : 'none';
    const nextDirection = direction === 'asc' ? 'desc' : 'asc';

    const handleClick = () => {
        setSort({ key: sortKey, direction: isSorting ? nextDirection : 'asc' });
    };

    return (
        <th scope="col" className={`px-6 py-3 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-600/50 ${className}`} onClick={handleClick}>
            <div className="flex items-center justify-center gap-1">
                {children}
                <span className="opacity-50">
                    {isSorting ? (direction === 'asc' ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />) : <ArrowUpIcon size={12} className="opacity-30" />}
                </span>
            </div>
        </th>
    );
};

const ProjectManagementDashboard: React.FC<ProjectManagementDashboardProps> = ({ onEditProject, projects, loadingProjects, onProjectsChange, currentUserProfile }) => {
    const { t, language, timezone } = useSettings();
    const { addToast } = useToasts();
    const { modals } = useModalManager();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    
    const sortedAndFilteredProjects = useMemo(() => {
        const filtered = searchTerm.trim()
            ? projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : projects;
        
        return [...filtered].sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            switch(sortConfig.key) {
                case 'name':
                    return a.name.localeCompare(b.name) * dir;
                case 'created_at':
                    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
                case 'members':
                    const aCount = a.project_members?.[0]?.count ?? 0;
                    const bCount = b.project_members?.[0]?.count ?? 0;
                    return (aCount - bCount) * dir;
                default:
                    return 0;
            }
        });

    }, [projects, searchTerm, sortConfig]);

    const executeDeleteProject = async (project: Project) => {
        const { error } = await supabase.from('projects').delete().eq('id', project.id);
        if (error) { addToast(error.message, 'error'); } 
        else { 
            addToast(`Project "${project.name}" deleted.`, 'success'); 
            onProjectsChange();
        }
    };

    const handleDeleteProject = (project: Project) => {
        modals.action.setState({
            isOpen: true, title: 'Delete Project',
            message: `Are you sure you want to delete the project "${project.name}"? This will also remove it from all users and unassign tasks.`,
            onConfirm: () => executeDeleteProject(project), confirmText: t.deleteTask,
            confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        });
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                 <div className="relative">
                    <input id="project-management-search" type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] text-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon size={16} className="text-gray-400" /></div>
                </div>
                {currentUserProfile?.role === 'admin' && (
                 <button onClick={() => onEditProject(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-full shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md focus:outline-none">
                    <PlusIcon size={14}/><span>Create Project</span>
                </button>
                )}
            </div>
            {loadingProjects ? <div className="flex justify-center items-center py-10"><SpinnerIcon size={32} className="animate-spin text-[var(--accent-color)]" /></div> : (
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <SortableHeader sortKey="name" currentSort={sortConfig} setSort={setSortConfig} className="text-left">Project Name</SortableHeader>
                                <SortableHeader sortKey="created_at" currentSort={sortConfig} setSort={setSortConfig}>{t.createdAt}</SortableHeader>
                                <SortableHeader sortKey="members" currentSort={sortConfig} setSort={setSortConfig}>{t.members}</SortableHeader>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredProjects.map(project => (
                                <tr key={project.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#ccc' }}></span>{project.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center tabular-nums">{formatAbsoluteDateTime(project.created_at, language, timezone)}</td>
                                    <td className="px-6 py-4 text-center font-semibold">{project.project_members?.[0]?.count ?? 0}</td>
                                    <td className="px-6 py-4 text-center space-x-2">
                                        <button onClick={() => onEditProject(project)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Edit Project"><EditIcon size={14} /></button>
                                        {currentUserProfile?.role === 'admin' && (
                                        <button onClick={() => handleDeleteProject(project)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" title="Delete Project"><TrashIcon size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {sortedAndFilteredProjects.length === 0 && <p className="text-center py-8 text-gray-500">{t.noTasksFound}</p>}
                </div>
            )}
        </>
    );
};

export default ProjectManagementDashboard;