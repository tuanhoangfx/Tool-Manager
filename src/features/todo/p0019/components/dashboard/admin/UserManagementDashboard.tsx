// @ts-nocheck

import React, { useMemo, useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useToasts } from '../../../context/ToastContext';
import { Profile, Project, ProjectMember } from '../../../types';
import { EditIcon, TrashIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from '../../Icons';
import { useModalManager } from '../../../hooks/useModalManager';
import Avatar from '../../common/Avatar';
import { supabase } from '../../../lib/supabase';
import { formatAbsoluteDateTime } from '../../../lib/taskUtils';
import { usePermission } from '../../../hooks/usePermission';

interface UserManagementDashboardProps {
    allUsers: Profile[];
    onUsersChange: () => void;
    currentUserProfile: Profile | null;
    onEditUser: (user: Profile) => void;
    projectMemberships: ProjectMember[];
}

type SortKey = keyof Profile | 'projects';

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


const UserManagementDashboard: React.FC<UserManagementDashboardProps> = ({ allUsers, onUsersChange, currentUserProfile, onEditUser, projectMemberships }) => {
    const { t, language, timezone } = useSettings();
    const { addToast } = useToasts();
    const { modals } = useModalManager();
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'full_name', direction: 'asc' });
    const { can } = usePermission(currentUserProfile);

    const userProjectsMap = useMemo(() => {
        const map = new Map<string, Project[]>();
        projectMemberships.forEach(membership => {
            if (!map.has(membership.user_id)) {
                map.set(membership.user_id, []);
            }
            if (membership.projects) {
                map.get(membership.user_id)!.push(membership.projects);
            }
        });
        return map;
    }, [projectMemberships]);
    
    const sortedAndFilteredUsers = useMemo(() => {
        const lowerCaseSearch = userSearchTerm.trim().toLowerCase();
        const filtered = userSearchTerm.trim()
            ? allUsers.filter(user => 
                (user.full_name || '').toLowerCase().includes(lowerCaseSearch) || 
                (user.email || '').toLowerCase().includes(lowerCaseSearch)
              )
            : allUsers;
        
        const roleOrder = { admin: 3, manager: 2, employee: 1 };

        return [...filtered].sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            switch(sortConfig.key) {
                case 'full_name':
                    return (a.full_name || '').localeCompare(b.full_name || '') * dir;
                case 'email':
                    return (a.email || '').localeCompare(b.email || '') * dir;
                case 'role':
                    return ((roleOrder[a.role] || 0) - (roleOrder[b.role] || 0)) * dir;
                case 'created_at':
                    return (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * dir;
                case 'last_sign_in_at':
                    return (new Date(a.last_sign_in_at || 0).getTime() - new Date(b.last_sign_in_at || 0).getTime()) * dir;
                case 'projects':
                    const aCount = userProjectsMap.get(a.id)?.length || 0;
                    const bCount = userProjectsMap.get(b.id)?.length || 0;
                    return (aCount - bCount) * dir;
                default:
                    return 0;
            }
        });

    }, [allUsers, userSearchTerm, sortConfig, userProjectsMap]);

    const executeDeleteUser = async (user: Profile) => {
        if (!can('delete', 'user', user)) {
            addToast("You do not have permission to delete users.", "error");
            return;
        }
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) {
            addToast(`Error: ${error.message}`, 'error');
        } else {
            addToast(`User ${user.full_name} deleted.`, 'success');
            onUsersChange();
        }
    }

    const handleDeleteUser = (user: Profile) => {
        modals.action.setState({
            isOpen: true, title: t.deleteUser, message: t.confirmDeleteUser(user.full_name || user.id),
            onConfirm: () => executeDeleteUser(user), confirmText: t.deleteTask,
            confirmButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        });
    };
    
    const RoleBadge: React.FC<{ role: Profile['role'] }> = ({ role }) => {
        const config = {
            admin: { label: t.admin, classes: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' },
            manager: { label: t.manager, classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
            employee: { label: t.employee, classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
        };
        const { label, classes } = config[role] || config.employee;
        return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${classes}`}>{label}</span>;
    };

    return (
        <>
            <div className="relative mb-4">
                <input id="user-management-search" type="text" placeholder={`${t.searchUsers} or email...`} value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon size={16} className="text-gray-400" /></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                     <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <SortableHeader sortKey="full_name" currentSort={sortConfig} setSort={setSortConfig} className="text-left">{t.fullName}</SortableHeader>
                            <SortableHeader sortKey="email" currentSort={sortConfig} setSort={setSortConfig} className="text-left">{t.emailLabel}</SortableHeader>
                            <SortableHeader sortKey="role" currentSort={sortConfig} setSort={setSortConfig}>{t.role}</SortableHeader>
                            <SortableHeader sortKey="projects" currentSort={sortConfig} setSort={setSortConfig}>Dự án</SortableHeader>
                            <SortableHeader sortKey="created_at" currentSort={sortConfig} setSort={setSortConfig}>Ngày tạo</SortableHeader>
                            <SortableHeader sortKey="last_sign_in_at" currentSort={sortConfig} setSort={setSortConfig}>Hoạt động gần nhất</SortableHeader>
                            <th scope="col" className="px-6 py-3 text-center">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredUsers.map(user => {
                            const projects = userProjectsMap.get(user.id) || [];
                            return (
                                <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        <div className="flex items-center gap-3"><Avatar user={user} title={user.full_name || ''} size={32} /><span>{user.full_name}</span></div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        {user.email || <span className="italic text-xs opacity-50">N/A</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center"><RoleBadge role={user.role} /></td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="relative group">
                                            <span className="font-semibold">{projects.length}</span>
                                            {projects.length > 0 && (
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg">
                                                    <ul className="space-y-1">
                                                        {projects.map(p => <li key={p.id} className="truncate">{p.name}</li>)}
                                                    </ul>
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800"></div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center tabular-nums">
                                        {user.created_at ? formatAbsoluteDateTime(user.created_at, language, timezone) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-center tabular-nums">
                                        {user.last_sign_in_at ? formatAbsoluteDateTime(user.last_sign_in_at, language, timezone) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-center space-x-2">
                                        {can('update', 'user', user) && (
                                            <button onClick={() => onEditUser(user)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title={t.editUser}><EditIcon size={14} /></button>
                                        )}
                                        {can('delete', 'user', user) && (
                                            <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" title={t.deleteUser}><TrashIcon size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {sortedAndFilteredUsers.length === 0 && <p className="text-center py-8 text-gray-500">{t.noTasksFound}</p>}
            </div>
        </>
    );
};

export default UserManagementDashboard;
