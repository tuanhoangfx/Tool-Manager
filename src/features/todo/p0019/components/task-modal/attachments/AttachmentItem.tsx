// @ts-nocheck

import React from 'react';
import { supabase } from '../../../lib/supabase';
import { DocumentTextIcon, TrashIcon, DownloadIcon, SpinnerIcon } from '../../Icons';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
};


const AttachmentItem: React.FC<{
    file: { name: string; type?: string; size: number; id?: number, file_path?: string, file_type?: string, dataUrl?: string };
    onRemove: () => void;
    onPreview: () => void;
    isNew: boolean;
    isSaving: boolean;
}> = React.memo(({ file, onRemove, onPreview, isNew, isSaving }) => {
    
    const handleDownload = async () => {
        if (isNew || !file.file_path) return;
        try {
            const { data, error } = await supabase.storage.from('task-attachments').download(file.file_path);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading file:', error.message);
            alert('Could not download file.');
        }
    };

    const isPreviewable = file.file_type?.startsWith('image/') || file.file_type?.startsWith('video/');

    return (
        <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
                {isPreviewable ? (
                     <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded flex-shrink-0 cursor-pointer" onClick={onPreview}>
                        {file.file_type?.startsWith('image/') && <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover rounded" />}
                        {file.file_type?.startsWith('video/') && <video src={file.dataUrl} className="w-full h-full object-cover rounded" />}
                    </div>
                ) : (
                     <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded flex-shrink-0 flex items-center justify-center">
                        <DocumentTextIcon size={24} className="text-gray-500 dark:text-gray-400" />
                    </div>
                )}
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</span>
                     {isNew && isSaving ? (
                        <span className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1">
                            <SpinnerIcon size={12} className="animate-spin" />
                            Uploading...
                        </span>
                    ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center flex-shrink-0">
                {!isNew && (
                     <button type="button" onClick={handleDownload} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Download">
                        <DownloadIcon size={16} />
                    </button>
                )}
                <button type="button" onClick={onRemove} disabled={isNew && isSaving} className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Remove">
                    <TrashIcon size={16} />
                </button>
            </div>
        </div>
    );
});

export default AttachmentItem;