// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSettings } from '../../../context/SettingsContext';
import { useToasts } from '../../../context/ToastContext';
import { Project, Profile, ProjectMember, MemberDetails } from '../../../types';
import { PlusIcon, SpinnerIcon, TrashIcon } from '../../Icons';
import { useModalManager } from '../../../hooks/useModalManager';
import ActionModal from '../../ActionModal';
import { getRandomColor, PROJECT_COLORS } from '../../../constants';
import Avatar from '../../common/Avatar';
import MultiSelectDropdown from './MultiSelectEmployeeDropdown';

interface ProjectDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, color: string, updatedMembers: MemberDetails[], originalMembers: MemberDetails[], project?: Project | null) => Promise<void>;
    project?: Project | null;
    allUsers: Profile[];
    currentUserProfile: Profile;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ isOpen, onClose, onSave, project, allUsers, currentUserProfile }) => {
    const { t, language } = useSettings();
    const { addToast } = useToasts();
    const [name, setName] = useState('');
    const [color, setColor] = useState(getRandomColor());
    const [isSaving, setIsSaving] = useState(false);

    const [members, setMembers] = useState<MemberDetails[]>([]);
    const [originalMembers, setOriginalMembers] = useState<MemberDetails[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [usersToAdd, setUsersToAdd] = useState<string[]>([]);

    const canEditDetails = currentUserProfile?.role === 'admin';

    const fetchMemberDetails = useCallback(async () => {
        if (!project || !project.id) {
            setMembers([]);
            setOriginalMembers([]);
            setLoadingMembers(false);
            return;
        }
        setLoadingMembers(true);
        const { data: memberData, error } = await supabase
            .from('project_members')
            .select('*, profiles(*)')
            .eq('project_id', project.id);
        
        if (error) {
            console.error("Error fetching members", error);
            addToast(error.message, 'error');
            setLoadingMembers(false);
            return;
        }

        // Optimize: Fetch all tasks for this project once
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('user_id')
            .eq('project_id', project.id);
            
        if (tasksError) {
            console.error("Error fetching project tasks for counts:", tasksError);
        }

        const taskCounts: Record<string, number> = {};
        tasksData?.forEach((t: any) => {
            taskCounts[t.user_id] = (taskCounts[t.user_id] || 0) + 1;
        });

        const membersWithCounts = (memberData as (ProjectMember & { profiles: Profile})[]).map((member) => {
            return { ...member, task_count: taskCounts[member.user_id] || 0 };
        });

        setMembers(membersWithCounts);
        setOriginalMembers(membersWithCounts);
        setLoadingMembers(false);
    }, [project, addToast]);


    useEffect(() => {
        if (isOpen) {
            setName(project?.name || '');
            setColor(project?.color || getRandomColor());
            setUsersToAdd([]);
            fetchMemberDetails();
        }
    }, [isOpen, project, fetchMemberDetails]);
    
    const potentialMembers = useMemo(() => {
        const memberIds = new Set(members.map(m => m.user_id));
        return allUsers.filter(u => !memberIds.has(u.id));
    }, [allUsers, members]);


    const handleAddMembers = () => {
        if (usersToAdd.length === 0) return;
        const users = allUsers.filter(u => usersToAdd.includes(u.id));
        const newMembers: MemberDetails[] = users.map(user => ({
            project_id: project!.id,
            user_id: user.id,
            created_at: new Date().toISOString(),
            profiles: user,
            projects: project!,
            task_count: 0,
        }));
        setMembers(current => [...current, ...newMembers]);
        setUsersToAdd([]);
    };
    
    const handleRemoveMember = (userId: string) => {
        setMembers(current => current.filter(m => m.user_id !== userId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        await onSave(name, color, members, originalMembers, project);
        setIsSaving(false);
    };

    const userAddOptions = useMemo(() => potentialMembers.map(u => ({ id: u.id, label: u.full_name || u.id, avatarUrl: u.avatar_url || undefined })), [potentialMembers]);
    const getUserAddLabel = (selectedCount: number) => {
        if (selectedCount === 0) return t.selectUserToAdd;
        if (selectedCount === 1) {
            const user = potentialMembers.find(u => u.id === usersToAdd[0]);
            return user?.full_name || '1 user selected';
        }
        return `${selectedCount} users selected`;
    };


    if (!isOpen) return null;

    const RoleBadge: React.FC<{ role: Profile['role'] }> = ({ role }) => {
        const config = {
            admin: { label: t.admin, classes: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' },
            manager: { label: t.manager, classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
            employee: { label: t.employee, classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
        };
        const { label, classes } = config[role] || config.employee;
        return (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${classes}`}>
                {label}
            </span>
        );
    };

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title={project ? 'Chỉnh sửa Dự án' : 'Tạo Dự án Mới'}
            message=""
            maxWidth="max-w-4xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 pt-0 max-h-[60vh] overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                            Thông tin cơ bản
                        </h3>
                         <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700/50 space-y-4">
                           <div>
                                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên dự án</label>
                                <input
                                    id="projectName"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    required
                                    disabled={!canEditDetails}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Màu dự án</label>
                                <div className={`flex flex-wrap gap-2 mt-2 ${!canEditDetails ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                    {PROJECT_COLORS.map(c => (
                                        <button type="button" key={c} onClick={() => setColor(c)} style={{backgroundColor: c}} className={`w-7 h-7 rounded-full ring-offset-2 dark:ring-offset-gray-800 transition-all ${color === c ? 'ring-2 ring-[var(--accent-color)] scale-110' : 'hover:scale-110'} disabled:hover:scale-100`} disabled={!canEditDetails}></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {project && (
                        <div>
                             <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                Thông tin chi tiết
                            </h3>
                             <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700/50">
                               <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.manageMembers}</h3>
                                 <div className="flex gap-2 mb-4">
                                     <MultiSelectDropdown
                                        options={userAddOptions}
                                        selectedIds={usersToAdd}
                                        onChange={setUsersToAdd}
                                        buttonLabel={(count) => getUserAddLabel(count)}
                                        buttonIcon={<></>}
                                        searchPlaceholder={t.searchUsers}
                                        allLabel="Select all available"
                                        onConfirmSelection={handleAddMembers}
                                        confirmLabel={(count) => `Add ${count} Member(s)`}
                                        widthClass="w-full"
                                    />
                                </div>
                                {loadingMembers ? (
                                    <div className="flex justify-center items-center py-10">
                                        <SpinnerIcon size={32} className="animate-spin text-[var(--accent-color)]" />
                                    </div>
                                ) : members.length === 0 ? (
                                    <p className="text-center text-gray-500 py-6">{t.noMembers}</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-md border dark:border-gray-700 max-h-56 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                                                    <th className="px-4 py-2">Thành viên</th>
                                                    <th className="px-4 py-2">{t.role}</th>
                                                    <th className="px-4 py-2">{t.joinedOn}</th>
                                                    <th className="px-4 py-2 text-center">{t.tasksInProject}</th>
                                                    <th className="px-4 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-700">
                                            {members.map(member => (
                                                <tr key={member.user_id}>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar user={member.profiles} title={member.profiles.full_name || ''} size={32} />
                                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{member.profiles.full_name}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2"><RoleBadge role={member.profiles.role} /></td>
                                                    <td className="px-4 py-2 tabular-nums text-gray-500 dark:text-gray-400">{new Date(member.created_at).toLocaleDateString(language)}</td>
                                                    <td className="px-4 py-2 text-center font-semibold tabular-nums">{member.task_count}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button type="button" onClick={() => handleRemoveMember(member.user_id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" title={t.removeMember}>
                                                            <TrashIcon size={16}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors">{t.cancel}</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 w-24 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-md shadow-md flex justify-center items-center">
                        {isSaving ? <SpinnerIcon size={20} className="animate-spin" /> : t.save}
                    </button>
                </div>
            </form>
        </ActionModal>
    );
};
export default ProjectDetailsModal;
