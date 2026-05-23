// @ts-nocheck

import React from 'react';
import { XIcon } from '@/components/Icons';
import { useSettings } from '@/context/SettingsContext';

interface GenericListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    filterContent?: React.ReactNode;
    footerContent?: React.ReactNode;
    scrollRef?: React.RefObject<HTMLDivElement>;
    maxWidth?: string;
}

const GenericListModal: React.FC<GenericListModalProps> = ({ 
    isOpen, onClose, title, children, filterContent, footerContent, scrollRef, maxWidth = "max-w-4xl"
}) => {
    const { t } = useSettings();

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-center overflow-y-auto p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out animate-fadeInUp my-auto`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 id="modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        aria-label={t.close}
                    >
                        <XIcon size={24} />
                    </button>
                </div>

                {filterContent && (
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
                        {filterContent}
                    </div>
                )}

                <div ref={scrollRef} className="overflow-y-auto flex-grow">
                    {children}
                </div>
                
                {footerContent && (
                     <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-right flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
                        {footerContent}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenericListModal;
