// @ts-nocheck


import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { BriefcaseIcon, UsersIcon, ClipboardListIcon, SettingsIcon } from '../Icons';
import { AdminView } from '../../App';
import { Profile } from '../../types';

interface AdminNavProps {
    activeView: AdminView;
    setView: (view: AdminView) => void;
    profile: Profile | null;
}

const AdminNav: React.FC<AdminNavProps> = ({ activeView, setView, profile }) => {
    const { t } = useSettings();

    const navItems = [
        { view: 'myTasks' as AdminView, label: t.employeeDashboard, icon: BriefcaseIcon },
        { view: 'taskDashboard' as AdminView, label: t.adminDashboard, icon: ClipboardListIcon },
        { view: 'management' as AdminView, label: t.management, icon: SettingsIcon },
    ];

    const availableNavItems = !profile ? [] : navItems;

    return (
        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
            {availableNavItems.map(item => (
                <button
                    key={item.view}
                    onClick={() => setView(item.view)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors ${activeView === item.view ? 'bg-white dark:bg-gray-800 shadow text-[var(--accent-color)]' : 'text-gray-600 dark:text-gray-400'}`}
                    title={item.label}
                >
                    <item.icon size={14}/>
                    <span className="hidden lg:inline">{item.label}</span>
                </button>
            ))}
        </div>
    );
};

export default React.memo(AdminNav);