// @ts-nocheck


import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { Project, Profile, ProjectMember } from '../../../types';
import { ProjectIcon, UsersIcon } from '../../Icons';
import { DataChange } from '../../../App';
import UserManagementDashboard from './UserManagementDashboard';
import ProjectManagementDashboard from './ProjectManagementDashboard';
import { supabase } from '../../../lib/supabase';
import { useLocalStorage } from '../../../hooks/useLocalStorage';


interface ManagementDashboardProps {
    allUsers: Profile[];
    onUsersChange: () => void;
    currentUserProfile: Profile | null;
    onEditUser: (user: Profile) => void;
    lastDataChange: DataChange | null;
    onEditProject: (project: Project | null) => void;
}

const ManagementDashboard: React.FC<ManagementDashboardProps> = (props) => {
    const { t } = useSettings();
    const [view, setView] = useState<'users' | 'projects'>('users');
    const [projectMemberships, setProjectMemberships] = useLocalStorage<ProjectMember[]>('admin_project_memberships', []);
    const [projects, setProjects] = useLocalStorage<Project[]>('admin_projects_with_counts', []);
    const [loadingProjects, setLoadingProjects] = useState(projects.length === 0);

    const fetchMemberships = useCallback(async () => {
        const { data, error } = await supabase
            .from('project_members')
            .select('*, projects!inner(*)');
        if (error) {
            console.error("Error fetching all memberships", error);
        } else if (data) {
            setProjectMemberships(data as any);
        }
    }, [setProjectMemberships]);
    
    const fetchProjects = useCallback(async () => {
        if (!props.currentUserProfile) return;

        if (projects.length === 0) {
            setLoadingProjects(true);
        }
        
        let query = supabase.from('projects').select('*, project_members(count)');

        if (props.currentUserProfile.role === 'manager') {
            const { data: memberProjectIds, error: memberError } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', props.currentUserProfile.id);

            if (memberError) {
                console.error("Error fetching manager's projects:", memberError);
                setLoadingProjects(false);
                return;
            }
            
            const projectIds = memberProjectIds.map(p => p.project_id);
            if (projectIds.length > 0) {
                 query = query.in('id', projectIds);
            } else {
                // If manager is not in any project, set projects to empty and return
                setProjects([]);
                setLoadingProjects(false);
                return;
            }
        }


        const { data, error } = await query;
        if (error) {
            console.error("Error fetching projects", error);
        } else if (data) {
            setProjects(data as Project[]);
        }
        setLoadingProjects(false);
    }, [projects.length, setProjects, props.currentUserProfile]);

    useEffect(() => {
        fetchMemberships();
        fetchProjects();
    }, [fetchMemberships, fetchProjects]);

    useEffect(() => {
        if (props.lastDataChange) {
            if (props.lastDataChange.payload?.table === 'project_members') {
                fetchMemberships();
            }
            if (props.lastDataChange.payload?.table === 'projects' || props.lastDataChange.payload?.table === 'project_members') {
                fetchProjects();
            }
        }
    }, [props.lastDataChange, fetchMemberships, fetchProjects]);
    

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-4 w-full animate-fadeInUp">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h2 className="font-bold text-xl flex items-center gap-2">
                    {view === 'users' ? <UsersIcon /> : <ProjectIcon />}
                    {view === 'users' ? `${t.userManagement}` : `${t.projectManagement}`}
                </h2>
                 <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1">
                    <button onClick={() => setView('users')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 transition-all ${view === 'users' ? 'bg-white dark:bg-gray-800 shadow text-[var(--accent-color)]' : 'text-gray-600 dark:text-gray-400'}`}>
                        <UsersIcon size={16} /> {t.userManagement}
                    </button>
                    {(props.currentUserProfile?.role === 'admin' || props.currentUserProfile?.role === 'manager') && (
                        <button onClick={() => setView('projects')} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex items-center gap-2 transition-all ${view === 'projects' ? 'bg-white dark:bg-gray-800 shadow text-[var(--accent-color)]' : 'text-gray-600 dark:text-gray-400'}`}>
                            <ProjectIcon size={16} /> {t.projectManagement}
                        </button>
                    )}
                </div>
            </div>

            {view === 'users' ? (
                <UserManagementDashboard 
                    allUsers={props.allUsers}
                    onUsersChange={props.onUsersChange}
                    currentUserProfile={props.currentUserProfile}
                    onEditUser={props.onEditUser}
                    projectMemberships={projectMemberships}
                />
            ) : (
                (props.currentUserProfile?.role === 'admin' || props.currentUserProfile?.role === 'manager') && (
                    <ProjectManagementDashboard
                        onEditProject={props.onEditProject}
                        projects={projects}
                        loadingProjects={loadingProjects}
                        onProjectsChange={fetchProjects}
                        currentUserProfile={props.currentUserProfile}
                    />
                )
            )}
        </div>
    );
};

export default React.memo(ManagementDashboard);