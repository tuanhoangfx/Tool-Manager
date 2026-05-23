// @ts-nocheck

import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { ViewGridIcon, CalendarDaysIcon } from '../Icons';

const DashboardViewToggle: React.FC<{ view: 'board' | 'calendar'; setView: (view: 'board' | 'calendar') => void; }> = ({ view, setView }) => {
    const { t } = useSettings();
    return (
        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1">
            <button onClick={() => setView('board')} aria-label={t.boardView} title={t.boardView} className={`p-1.5 rounded-full transition-colors ${view === 'board' ? 'bg-white dark:bg-gray-800 shadow text-[var(--accent-color)]' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}><ViewGridIcon size={18} /></button>
            <button onClick={() => setView('calendar')} aria-label={t.calendarView} title={t.calendarView} className={`p-1.5 rounded-full transition-colors ${view === 'calendar' ? 'bg-white dark:bg-gray-800 shadow text-[var(--accent-color)]' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}><CalendarDaysIcon size={18} /></button>
        </div>
    );
};

export default React.memo(DashboardViewToggle);
