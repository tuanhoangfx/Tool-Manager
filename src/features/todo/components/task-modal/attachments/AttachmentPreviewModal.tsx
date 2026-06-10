import React from 'react';
import { XIcon } from '../../Icons';

const AttachmentPreviewModal: React.FC<{ attachment: any; onClose: () => void }> = ({ attachment, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-8 -right-2 text-white hover:text-gray-300" aria-label="Close preview"><XIcon size={28} /></button>
                {attachment.file_type.startsWith('image/') && <img src={attachment.dataUrl} alt={attachment.name} className="max-w-full max-h-[90vh] object-contain rounded-lg" />}
                {attachment.file_type.startsWith('video/') && <video src={attachment.dataUrl} controls autoPlay className="max-w-full max-h-[90vh] object-contain rounded-lg" />}
            </div>
        </div>
    )
};

export default AttachmentPreviewModal;
