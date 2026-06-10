
import React from 'react';
import { Profile } from '../../types';

interface AvatarProps {
    user: Partial<Profile> & { full_name: string | null };
    title: string;
    size?: number;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ user, title, size = 20, className }) => {
    const style = { width: `${size}px`, height: `${size}px` };
    const fontSize = size < 24 ? 10 : (size < 32 ? 12 : 14);
    const userInitial = (user.full_name || '?').charAt(0).toUpperCase();
    const defaultClassName = 'rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-bold';

    return (
        <div title={title}>
            {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || ''} style={style} className="rounded-full object-cover" />
            ) : (
                <div style={style} className={className || defaultClassName}>
                    <span style={{ fontSize: `${fontSize}px` }}>{userInitial}</span>
                </div>
            )}
        </div>
    );
};
export default React.memo(Avatar);
