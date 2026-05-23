// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { XIcon, SpinnerIcon, PlusIcon, TrashIcon, ProjectIcon } from '@/components/Icons';
import { useSettings } from '@/context/SettingsContext';
import { useToasts } from '@/context/ToastContext';
import type { Profile, Project, ProjectMember } from '@/types';
import Avatar from '@/components/common/Avatar';
import { PROJECT_COLORS } from '@/constants';
import MultiSelectDropdown from '@/components/dashboard/admin/MultiSelectEmployeeDropdown';

interface UserProjectDetails extends Project {
    joined_at: string;
    task_count: number;
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employee: Profile;
  currentUserProfile: Profile;
}

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({ isOpen, onClose, onSave, employee, currentUserProfile }) => {
    const { t, language } = useSettings();
    const { addToast } = useToasts();
    
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fullName, setFullName] = useState(employee.full_name);
    const [role, setRole] = useState(employee.role);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(employee.avatar_url);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [userProjectIds, setUserProjectIds] = useState<Set<number>>(new Set());
    const [userProjectDetails, setUserProjectDetails] = useState<UserProjectDetails[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [projectsToAdd, setProjectsToAdd] = useState<string[]>([]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const fetchProjectsAndDetails = useCallback(async () => {
        if (!isOpen) return;
        setProjectsLoading(true);

        let managerPids: number[] | null = null;
        if (currentUserProfile.role === 'manager') {
            const { data: managerProjectIds, error: managerError } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', currentUserProfile.id);
            if (managerError) {
                console.error("Error fetching manager's projects", managerError);
                addToast(`Error fetching manager's projects: ${managerError.message}`, 'error');
                setProjectsLoading(false);
                return;
            }
            managerPids = managerProjectIds.map(p => p.project_id);
        }

        // 1. Fetch all projects manager can see
        let projectQuery = supabase.from('projects').select('*');
        if (managerPids !== null) {
            projectQuery = projectQuery.in('id', managerPids);
        }
        const { data: projectsData, error: projectsError } = await projectQuery;
        const allVisibleProjects = (projectsData as Project[]) || [];
        setAllProjects(allVisibleProjects);
        if (projectsError) { console.error("Error fetching projects", projectsError.message); }

        // 2. Fetch employee's memberships (respecting manager's project visibility)
        let memberQuery = supabase.from('project_members').select('project_id, created_at').eq('user_id', employee.id);
        if (managerPids !== null) {
            memberQuery = memberQuery.in('project_id', managerPids);
        }
        const { data: memberData, error: memberError } = await memberQuery;
        if (memberError) { 
            console.error("Error fetching member data", memberError);
            addToast(`Error fetching member data: ${memberError.message}`, 'error');
            setProjectsLoading(false);
            return;
        }

        // 3. Optimize: Fetch all relevant tasks once to count them
        const memberProjectIds = (memberData || []).map(m => m.project_id);
        const taskCounts: Record<number, number> = {};
        
        if (memberProjectIds.length > 0) {
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('project_id')
                .eq('user_id', employee.id)
                .in('project_id', memberProjectIds);
            
            if (tasksError) {
                console.error("Error fetching tasks for counts:", tasksError.message);
            } else {
                tasksData?.forEach((t: any) => {
                    if(t.project_id) taskCounts[t.project_id] = (taskCounts[t.project_id] || 0) + 1;
                });
            }
        }

        const details = (memberData || []).map((membership) => {
            const projectInfo = allVisibleProjects.find(p => p.id === membership.project_id);
            if (!projectInfo) return null;

            return { 
                ...projectInfo, 
                joined_at: membership.created_at, 
                task_count: taskCounts[membership.project_id] || 0 
            };
        }).filter(Boolean) as UserProjectDetails[];

        setUserProjectDetails(details);
        setUserProjectIds(new Set(details.map(d => d.id)));
        setProjectsLoading(false);

    }, [isOpen, employee.id, currentUserProfile.id, currentUserProfile.role, addToast]);


    useEffect(() => {
        setFullName(employee.full_name);
        setRole(employee.role);
        setAvatarUrl(employee.avatar_url);
        setAvatarFile(null);
        setMessage({text: '', type: ''});
        if(isOpen) fetchProjectsAndDetails();
    }, [employee, isOpen, fetchProjectsAndDetails]);
    
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
            setAvatarUrl(URL.createObjectURL(e.target.files[0]));
        }
    };
    
    const availableProjects = useMemo(() => {
        return allProjects.filter(p => !userProjectIds.has(p.id));
    }, [allProjects, userProjectIds]);

    const handleAddProject = () => {
        if (projectsToAdd.length === 0) return;
        const newProjectInfos = allProjects.filter(p => projectsToAdd.includes(p.id.toString()));
        
        const newDetails: UserProjectDetails[] = newProjectInfos.map(p => ({
            ...p,
            joined_at: new Date().toISOString(),
            task_count: 0,
        }));
        
        setUserProjectIds(prev => new Set([...prev, ...newProjectInfos.map(p => p.id)]));
        setUserProjectDetails(prev => [...prev, ...newDetails]);
        setProjectsToAdd([]);
    };

    const handleRemoveProject = (projectId: number) => {
        setUserProjectIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(projectId);
            return newSet;
        });
        setUserProjectDetails(prev => prev.filter(p => p.id !== projectId));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploading(!!avatarFile);
        setMessage({ text: '', type: '' });

        try {
            let newAvatarUrl = avatarUrl;
            
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${employee.id}/${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, {
                    cacheControl: '3600',
                    upsert: true
                });
                if (uploadError) throw uploadError;

                const { data: urlData } = await supabase.storage.from('avatars').getPublicUrl(filePath);
                newAvatarUrl = urlData.publicUrl;
            }

            const { error: profileError } = await supabase.from('profiles').update({
                full_name: fullName,
                role,
                avatar_url: newAvatarUrl
            }).eq('id', employee.id);

            if (profileError) throw profileError;
            
            const { data: currentMemberships } = await supabase.from('project_members').select('project_id').eq('user_id', employee.id);

            // Explicitly cast project_id to number to avoid type errors with Supabase partial selects
            const currentProjectIds = new Set<number>(
                (currentMemberships || []).map((p: any) => Number(p.project_id))
            );
            
            const toAdd = [...userProjectIds].filter(id => !currentProjectIds.has(id));
            const toRemove = [...currentProjectIds].filter(id => !userProjectIds.has(id));
            
            if (toAdd.length > 0) {
                await supabase.from('project_members').insert(toAdd.map(pid => ({ project_id: pid, user_id: employee.id })));
            }
            if (toRemove.length > 0) {
                await supabase.from('project_members').delete().eq('user_id', employee.id).in('project_id', toRemove);
            }

            onSave();

        } catch (error: any) {
            console.error("Error updating employee profile:", error.message);
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    const userForAvatar = {
        ...employee,
        full_name: fullName,
        avatar_url: avatarUrl,
    };
    
    const canEditRole = currentUserProfile.role === 'admin';

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1010] flex justify-center overflow-y-auto p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-employee-modal-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 ease-out animate-fadeInUp max-h-[90vh] flex flex-col my-auto"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 relative flex-shrink-0">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors z-10"
                            aria-label={t.close}
                        >
                            <XIcon size={24} />
                        </button>
                        <h2 id="edit-employee-modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t.editEmployeeProfile}</h2>
                    </div>
                    <div className="overflow-y-auto px-6 space-y-6">
                         <div>
                            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                Thông tin hồ sơ
                            </h3>
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700/50">
                                <div className="flex items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <label className="block text-sm font-medium text-center text-gray-700 dark:text-gray-300">{t.avatar}</label>
                                        <div className="mt-2 flex flex-col items-center gap-2">
                                            <Avatar user={userForAvatar} title="Avatar" size={80} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors">{t.uploadAvatar}</button>
                                            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/png, image/jpeg" className="hidden"/>
                                        </div>
                                    </div>
                                    <div className="flex-grow space-y-4">
                                        <div>
                                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.fullName}</label>
                                            <input type="text" id="fullName" value={fullName || ''} onChange={e => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.role}</label>
                                            <select id="role" value={role} onChange={e => setRole(e.target.value as Profile['role'])} disabled={!canEditRole} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm disabled:opacity-50">
                                                <option value="employee">{t.employee}</option>
                                                <option value="manager">{t.manager}</option>
                                                {canEditRole && <option value="admin">{t.admin}</option>}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                Thông tin chi tiết
                            </h3>
                             <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700/50">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dự án</label>
                                <div className="my-2">
                                    <MultiSelectDropdown
                                        options={availableProjects.map(p => ({ id: p.id.toString(), label: p.name, icon: <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length] }}></span> }))}
                                        selectedIds={projectsToAdd}
                                        onChange={setProjectsToAdd}
                                        buttonLabel={(count) => count > 0 ? `${count} projects selected` : "Select projects to add..."}
                                        buttonIcon={<ProjectIcon size={16} />}
                                        searchPlaceholder="Search projects..."
                                        allLabel="Select all available"
                                        onConfirmSelection={handleAddProject}
                                        confirmLabel={(count) => `Add ${count} Project(s)`}
                                        widthClass="w-full"
                                    />
                                </div>
                                <div className="mt-2 rounded-md border border-gray-300 dark:border-gray-600 max-h-56 overflow-y-auto">
                                    {projectsLoading ? (
                                        <div className="flex justify-center items-center py-10"><SpinnerIcon size={24} className="animate-spin text-[var(--accent-color)]" /></div>
                                    ) : userProjectDetails.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Dự án</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{t.joinedOn}</th>
                                                    <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Công việc</th>
                                                    <th className="px-4 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {userProjectDetails.map(project => (
                                                <tr key={project.id} className="border-t dark:border-gray-700">
                                                    <td className="px-4 py-2 font-semibold">
                                                        <div className="flex items-center gap-2">
                                                            <span 
                                                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                                                style={{ backgroundColor: project.color || PROJECT_COLORS[project.id % PROJECT_COLORS.length] }}>
                                                            </span>
                                                            <span>{project.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 tabular-nums">{new Date(project.joined_at).toLocaleDateString(language)}</td>
                                                    <td className="px-4 py-2 text-center">{project.task_count}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button type="button" onClick={() => handleRemoveProject(project.id)} className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon size={14}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="text-center text-xs text-gray-400 py-4">Chưa là thành viên của dự án nào.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 flex justify-between items-center rounded-b-2xl mt-4 flex-shrink-0">
                         {message.text && <span className={`text-sm animate-fadeIn ${message.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{message.text}</span>}
                        <div className="flex-grow flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors">{t.cancel}</button>
                            <button type="submit" disabled={loading || uploading} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-md shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none disabled:opacity-50 flex items-center justify-center w-24">
                                {uploading ? <SpinnerIcon size={20} className="animate-spin" /> : (loading ? <SpinnerIcon size={20} className="animate-spin" /> : t.save)}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default React.memo(EditEmployeeModal);
