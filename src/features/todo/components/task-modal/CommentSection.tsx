
import React, { useState } from 'react';
import { HubFormFieldLabel } from '@tool-workspace/hub-ui';
import { useSettings } from '../../context/SettingsContext';
import { TaskComment, Profile } from '../../types';
import { formatAbsoluteDateTime } from '../../lib/taskUtils';
import { resolveTodoProfile } from '../../todo-resolve-profile';
import { ChatBubbleIcon, SendIcon, SpinnerIcon } from '../../components/Icons';
import Avatar from '../common/Avatar';
import { TODO_HUB } from '../../styles/todo-hub-classes';

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
    allUsers: Profile[];
    /** Side panel inside Details — compact height, no standalone TOC section. */
    embedded?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({
    comments,
    onPostComment,
    isPostingComment,
    allUsers,
    embedded = false,
}) => {
    const { t, language, timezone } = useSettings();
    const [newComment, setNewComment] = useState('');

    const handlePost = async () => {
        if (!newComment.trim()) return;
        await onPostComment(newComment);
        setNewComment('');
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handlePost();
        }
    };

    const panelClass = embedded ? TODO_HUB.panelInsetCompact : TODO_HUB.panelInset;

    return (
        <div className={embedded ? "contents" : "flex min-h-0 flex-col"}>
            <HubFormFieldLabel className="block">
              {t.comments} ({comments.length})
            </HubFormFieldLabel>
            <div className={panelClass}>
                {comments.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-[var(--muted)]">
                        <ChatBubbleIcon size={32} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">{t.noCommentsYet}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                    {comments.map(comment => {
                        const author = resolveTodoProfile(comment.user_id, comment.profiles, allUsers);
                        return (
                        <div key={comment.id} className={`flex items-start gap-2.5 transition-opacity ${'isSending' in comment && comment.isSending ? 'opacity-60' : ''}`}>
                            <div className="flex-shrink-0">
                                <Avatar user={author} title={author.full_name || ''} size={28} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-[var(--text)]">{author.full_name || author.email || 'Unknown'}</span>
                                    <time className="text-xs tabular-nums text-[var(--muted)]">
                                        {'isSending' in comment && comment.isSending ? 'Sending...' : formatAbsoluteDateTime(comment.created_at, language, timezone)}
                                    </time>
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm text-[var(--muted)]">{comment.content}</p>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                )}
            </div>
            <div className={`${embedded ? TODO_HUB.commentInputRow : "mt-2"} flex items-center gap-2`}>
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    placeholder={t.addComment}
                    disabled={isPostingComment}
                    className={TODO_HUB.fieldComment}
                />
                <button
                    type="button"
                    onClick={handlePost}
                    disabled={isPostingComment || !newComment.trim()}
                    className="shrink-0 rounded-full bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] p-2 text-white transition-opacity hover:scale-110 disabled:opacity-50"
                    aria-label={t.post}
                >
                    {isPostingComment ? <SpinnerIcon size={20} className="animate-spin" /> : <SendIcon size={20} />}
                </button>
            </div>
        </div>
    );
};

export default CommentSection;
