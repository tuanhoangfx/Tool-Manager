// @ts-nocheck
import React from 'react';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = React.memo(({ icon, label, value }) => (
    <div className="bg-white dark:bg-gray-800/80 rounded-lg shadow p-3 flex items-center gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-full">{icon}</div>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
));

export default StatCard;
