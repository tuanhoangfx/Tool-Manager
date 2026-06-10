import { useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from "../lib/supabase";
import { useLocalStorage } from "./useLocalStorage";
import { useToasts } from "../context/ToastContext";
import type { Project, ProjectMember, Profile, MemberDetails } from "../types";
import type { DataChange } from "../app-types";

interface UseProjectsProps {
    session: Session | null;
    profile: Profile | null;
    lastDataChange: DataChange | null;
    notifyDataChange: (change: Omit<DataChange, 'timestamp'>) => void;
    closeProjectModal: () => void;
}

export const useProjects = ({ session, profile, lastDataChange, notifyDataChange, closeProjectModal }: UseProjectsProps) => {
    const { addToast } = useToasts();
    const [userProjects, setUserProjects] = useLocalStorage<ProjectMember[]>(
        session ? `user_projects_${session.user.id}` : 'user_projects_guest',
        []
    );

    useEffect(() => {
        const fetchUserProjects = async () => {
            if (!session) {
                setUserProjects([]);
                return;
            }
            const { data, error } = await supabase
                .from('project_members')
                .select('*, projects!inner(*)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching user projects:", error);
            } else {
                setUserProjects(data as ProjectMember[]);
            }
        };
        fetchUserProjects();
    }, [session, lastDataChange, setUserProjects]);

    const handleSaveProject = async (name: string, color: string, updatedMembers: MemberDetails[], originalMembers: MemberDetails[], project: Project | null) => {
        if (!profile) return;

        const isNew = !project?.id;
        let currentProjectData = project;

        // Step 1: Handle Project Details (Name, Color) - Admin only
        if (profile.role === 'admin') {
            const projectData = { name, color, ...(isNew && { created_by: profile.id }) };
            const { data: savedProject, error: projectError } = isNew
                ? await supabase.from('projects').insert(projectData).select().single()
                : await supabase.from('projects').update({ name, color }).eq('id', project!.id).select().single();

            if (projectError) {
                addToast(projectError.message, 'error');
                return;
            }
            currentProjectData = savedProject;
        }

        if (!currentProjectData) {
            addToast('Project could not be saved. You may not have permissions.', 'error');
            return;
        }

        const projectId = currentProjectData.id;

        // Step 2: Handle Member changes - Admin & Manager on existing projects
        if (!isNew) {
            const originalMemberIds = new Set(originalMembers.map(m => m.user_id));
            const updatedMemberIds = new Set(updatedMembers.map(m => m.user_id));
            const toAddIds = [...updatedMemberIds].filter(id => !originalMemberIds.has(id));
            const toRemoveIds = [...originalMemberIds].filter(id => !updatedMemberIds.has(id));

            if (toRemoveIds.length > 0) {
                const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).in('user_id', toRemoveIds);
                if (error) addToast(`Error removing members: ${error.message}`, 'error');
            }

            if (toAddIds.length > 0) {
                const { error } = await supabase.from('project_members').insert(toAddIds.map(userId => ({ project_id: projectId, user_id: userId })));
                if (error) addToast(`Error adding members: ${error.message}`, 'error');
            }
        }

        // Step 3: Handle New Project specific actions - Admin only
        if (isNew && profile.role === 'admin' && currentProjectData) {
            const { error: memberError } = await supabase.from('project_members').insert({ project_id: projectId, user_id: profile.id });
            if (memberError) addToast("Project created, but failed to add creator as member.", 'error');
            
            const { data: admins, error: adminError } = await supabase.from('profiles').select('id').eq('role', 'admin');
            if (adminError) {
                console.error("Could not fetch admins to notify", adminError);
            } else if (admins) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    actor_id: profile.id,
                    type: 'new_project_created',
                    data: { project_id: projectId, project_name: name, creator_name: profile.full_name }
                }));
                const { error: notifError } = await supabase.from('notifications').insert(notifications);
                if (notifError) console.error("Failed to create project notifications", notifError);
            }
        }

        addToast(`Project ${isNew ? 'created' : 'updated'} successfully`, 'success');
        closeProjectModal();
        notifyDataChange({ type: 'batch_update', payload: { table: 'projects' } });
    };

    return { userProjects, handleSaveProject };
};
