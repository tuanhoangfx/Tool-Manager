import React from 'react';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = React.memo(({ icon, label, value }) => (
    <div className="todo-hub-stat-card">
        <div className="todo-hub-stat-card__icon">{icon}</div>
        <div>
            <p className="todo-hub-stat-card__label">{label}</p>
            <p className="todo-hub-stat-card__value">{value}</p>
        </div>
    </div>
));

export default StatCard;
