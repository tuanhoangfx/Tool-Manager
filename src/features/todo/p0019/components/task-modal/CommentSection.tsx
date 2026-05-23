// @ts-nocheck

import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { TaskComment, Profile } from '../../types';
import { formatAbsoluteDateTime } from '../../lib/taskUtils';
import { ChatBubbleIcon, SendIcon, SpinnerIcon } from '../../components/Icons';
import Avatar from '../common/Avatar';

export interface TempComment {
    id: string;
    content: string;
    profiles: Profile;
    user_id: string;
    created_at: string;
    task_id: number;
    isSending?: boolean;
}

interface CommentSectionProps {
    comments: (TaskComment | TempComment)[];
    onPostComment: (comment: string) => Promise<void>;
    isPostingComment: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, onPostComment, isPostingComment }) => {
    const { t, language, timezone } = useSettings();
    const [newComment, setNewComment] = useState('');
    const [isCommentInputVisible, setCommentInputVisible] = useState(false);

    const handlePost = async () => {
        if (!newComment.trim()) return;
        await onPostComment(newComment);
        setNewComment('');
    };

    return (
        <div className="flex flex-col h-full">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.comments} ({comments.length})</label>
            <div className="flex-grow bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-3 overflow-y-auto min-h-[80px] md:min-h-[400px]">
                {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <ChatBubbleIcon size={32} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">{t.noCommentsYet}</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className={`flex items-start gap-2.5 transition-opacity ${'isSending' in comment && comment.isSending ? 'opacity-60' : ''}`}>
                            <div className="flex-shrink-0">
                                <Avatar user={comment.profiles} title={comment.profiles.full_name || ''} size={28} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{comment.profiles?.full_name}</span>
                                    <time className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                        {'isSending' in comment && comment.isSending ? 'Sending...' : formatAbsoluteDateTime(comment.created_at, language, timezone)}
                                    </time>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-2">
                {isCommentInputVisible ? (
                    <div className="flex items-center gap-2">
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder={t.addComment}
                            rows={1}
                            autoFocus
                            disabled={isPostingComment}
                            className="flex-grow block px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm resize-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                        />
                        <button
                            type="button"
                            onClick={handlePost}
                            disabled={isPostingComment || !newComment.trim()}
                            className="p-2 rounded-full text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] disabled:opacity-50 transition-opacity transform hover:scale-110"
                            aria-label={t.post}
                        >
                            {isPostingComment ? <SpinnerIcon size={20} className="animate-spin" /> : <SendIcon size={20} />}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setCommentInputVisible(true)}
                        className="w-full text-left px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:border-[var(--accent-color)] dark:hover:border-[var(--accent-color-dark)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] text-sm transition-colors"
                    >
                        {t.addComment}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CommentSection;