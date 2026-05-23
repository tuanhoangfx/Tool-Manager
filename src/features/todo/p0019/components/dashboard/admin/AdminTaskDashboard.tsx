// @ts-nocheck

import React, { useState, useEffect, useCallback } from 'react';
import type { Profile, Task, TimeLog, Project } from '../../../types';
import type { DataChange, TaskCounts } from '../../../App';
import AllTasksView from './AllTasksView';
import { supabase } from '../../../lib/supabase';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

interface AdminTaskDashboardProps {
    profile: Profile | null;
    lastDataChange: DataChange | null;
    allUsers: Profile[];
    onEditTask: (task: Task | Partial<Task> | null) => void;
    onDeleteTask: (task: Task) => void;
    onClearCancelledTasks: (tasks: Task[]) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => Promise<boolean>;
    onStartTimer: (task: Task) => void;
    onStopTimer: (timeLog: TimeLog) => void;
    activeTimer: TimeLog | null;
    setTaskCounts: React.Dispatch<React.SetStateAction<TaskCounts>>;
}

const AdminTaskDashboard: React.FC<AdminTaskDashboardProps> = (props) => {
    const [allProjects, setAllProjects] = useLocalStorage<Project[]>('all_admin_projects', []);

    const fetchProjects = useCallback(async () => {
        if (!props.profile) return;
        
        let query = supabase.from('projects').select('*');

        if (props.profile.role === 'manager') {
             const { data: memberProjectIds, error: memberError } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', props.profile.id);
            
            if (memberError) {
                console.error("Error fetching manager's projects:", memberError.message);
                return;
            }
            const projectIds = memberProjectIds.map(p => p.project_id);
            if (projectIds.length > 0) {
                 query = query.in('id', projectIds);
            } else {
                setAllProjects([]);
                return;
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching projects for admin dashboard:", error.message);
        } else if (data) {
            setAllProjects(data as Project[]);
        }
    }, [props.profile, setAllProjects]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects, props.lastDataChange]);


    return (
        <div className="w-full animate-fadeInUp">
            <AllTasksView {...props} profile={props.profile} allProjects={allProjects} />
        </div>
    );
};


export default AdminTaskDashboard;
