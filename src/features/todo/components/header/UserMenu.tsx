
import React, { useState, useRef, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSettings } from '../../context/SettingsContext';
import type { Profile } from '../../types';
import { LogOutIcon, UserIcon } from '../Icons';
import Avatar from '../common/Avatar';

interface UserMenuProps {
  session: Session;
  profile: Profile | null;
  onAccountClick: () => void;
  handleSignOut: () => void;
}

const UserMenu: React.FC<UserMenuProps> = 
({ session, profile, onAccountClick, handleSignOut }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { t } = useSettings();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = profile?.full_name || session.user.email || '';
    const avatarUrl = profile?.avatar_url;

    const userForAvatar = {
        full_name: displayName,
        avatar_url: avatarUrl
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--accent-color)] dark:hover:text-[var(--accent-color-dark)] transition-colors"
            >
                <Avatar 
                    user={userForAvatar}
                    title={displayName}
                    size={28}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center text-white font-bold text-xs"
                />
                <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 animate-fadeIn">
                    <div className="p-2">
                        <button
                            onClick={() => { onAccountClick(); setIsOpen(false); }}
                            className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20 transition-colors"
                        >
                            <UserIcon size={16} />
                            <span>{t.accountSettings}</span>
                        </button>
                        <div className="my-1 border-t border-black/10 dark:border-white/10"></div>
                        <button
                            onClick={() => { handleSignOut(); setIsOpen(false); }}
                            className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                            <LogOutIcon size={16} />
                            <span>{t.signOut}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(UserMenu);
