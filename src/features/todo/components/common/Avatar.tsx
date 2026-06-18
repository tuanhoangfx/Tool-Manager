
import React, { useState } from 'react';
import { compactIconSize, resolveWorkspaceRoleIcon } from '@tool-workspace/hub-ui';
import { Profile } from '../../types';

interface AvatarProps {
    user: Partial<Profile> & { full_name: string | null };
    title: string;
    size?: number;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ user, title, size = 20, className }) => {
    const [imgBroken, setImgBroken] = useState(false);
    const style = { width: `${size}px`, height: `${size}px` };
    const iconSize = compactIconSize(Math.max(10, Math.round(size * 0.55)));
    const roleMeta = resolveWorkspaceRoleIcon(user.role ?? 'employee');
    const RoleIcon = roleMeta.icon;
    const fallbackClass =
        className ||
        'rounded-full border border-indigo-400/20 bg-indigo-500/12 flex items-center justify-center';

    return (
        <div title={title}>
            {user.avatar_url && !imgBroken ? (
                <img
                    src={user.avatar_url}
                    alt={user.full_name || ''}
                    style={style}
                    className="rounded-full object-cover"
                    onError={() => setImgBroken(true)}
                />
            ) : (
                <div style={style} className={fallbackClass} aria-hidden>
                    <RoleIcon size={iconSize} className={roleMeta.className} />
                </div>
            )}
        </div>
    );
};
export default React.memo(Avatar);
