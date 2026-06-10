import React, { useState, useEffect, useMemo } from 'react';
import { XIcon, SearchIcon, PlayIcon, ClipboardListIcon, UsersIcon, SettingsIcon, KeyboardIcon } from "./Icons";
import { useSettings } from "../context/SettingsContext";
import type { Translation } from "../types";

// FIX: Add IconProps to strongly type icon components.
interface IconProps {
  className?: string;
  size?: number;
  fill?: string;
}

// FIX: Define a type for translation keys that point to string values to ensure type safety.
type StringTranslationKey = {
  [K in keyof Translation]: Translation[K] extends string ? K : never;
}[keyof Translation];

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <details className="group border-b border-gray-200 dark:border-gray-700 py-4 last:border-b-0" open>
    <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center text-gray-800 dark:text-gray-200 group-hover:text-[var(--accent-color)] dark:group-hover:text-[var(--accent-color-dark)] transition-colors">
      <div className="flex items-center gap-3">
        {icon}
        {title}
      </div>
      <span className="transform transition-transform duration-200 group-open:rotate-180 text-sm">▼</span>
    </summary>
    <div className="mt-4 text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
      {children}
    </div>
  </details>
);

// FIX: Strongly type the guideSections array to prevent type errors with translation keys.
const guideSections: Array<{
    titleKey: StringTranslationKey;
    icon: React.FC<IconProps>;
    items: Array<{
        strongKey: StringTranslationKey;
        textKey: StringTranslationKey;
    }>;
}> = [
    {
        titleKey: 'userGuide_s1_title',
        icon: PlayIcon,
        items: [
            { strongKey: 'userGuide_s1_l1_strong', textKey: 'userGuide_s1_l1_text' },
            { strongKey: 'userGuide_s1_l2_strong', textKey: 'userGuide_s1_l2_text' },
        ]
    },
    {
        titleKey: 'userGuide_s2_title',
        icon: ClipboardListIcon,
        items: [
            { strongKey: 'userGuide_s2_l1_strong', textKey: 'userGuide_s2_l1_text' },
            { strongKey: 'userGuide_s2_l2_strong', textKey: 'userGuide_s2_l2_text' },
            { strongKey: 'userGuide_s2_l3_strong', textKey: 'userGuide_s2_l3_text' },
        ]
    },
    {
        titleKey: 'userGuide_s3_title',
        icon: UsersIcon,
        items: [
            { strongKey: 'userGuide_s3_l1_strong', textKey: 'userGuide_s3_l1_text' },
            { strongKey: 'userGuide_s3_l2_strong', textKey: 'userGuide_s3_l2_text' },
        ]
    },
    {
        titleKey: 'userGuide_s4_title',
        icon: SettingsIcon,
        items: [
            { strongKey: 'userGuide_s4_l1_strong', textKey: 'userGuide_s4_l1_text' },
            { strongKey: 'userGuide_s4_l2_strong', textKey: 'userGuide_s4_l2_text' },
        ]
    },
    {
        titleKey: 'userGuide_s5_title',
        icon: KeyboardIcon,
        items: [
            { strongKey: 'userGuide_s5_l1_strong', textKey: 'userGuide_s5_l1_text' },
            { strongKey: 'userGuide_s5_l2_strong', textKey: 'userGuide_s5_l2_text' },
            { strongKey: 'userGuide_s5_l3_strong', textKey: 'userGuide_s5_l3_text' },
        ]
    },
];


const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
    const { t } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSections = useMemo(() => {
        if (!searchTerm.trim()) {
            return guideSections;
        }
        const lowercasedFilter = searchTerm.toLowerCase();

        return guideSections.filter(section => {
            const titleText = t[section.titleKey];
            const titleMatch = typeof titleText === 'string' && titleText.toLowerCase().includes(lowercasedFilter);
            if (titleMatch) {
                return true;
            }
            
            const contentMatch = section.items.some(item => {
                const strongText = t[item.strongKey];
                const regularText = t[item.textKey];
                const strongMatch = typeof strongText === 'string' && strongText.toLowerCase().includes(lowercasedFilter);
                const textMatch = typeof regularText === 'string' && regularText.toLowerCase().includes(lowercasedFilter);
                return strongMatch || textMatch;
            });
            return contentMatch;
        });

    }, [searchTerm, t]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setSearchTerm(''); // Reset search on open
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;
  
    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex justify-center overflow-y-auto p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-guide-modal-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out animate-fadeInUp my-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 id="user-guide-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">{t.howToUseThisApp}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        aria-label={t.close}
                    >
                        <XIcon size={24} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t.userGuide_searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon size={20} className="text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto p-6">
                    {filteredSections.length > 0 ? (
                        filteredSections.map((section, index) => {
                           const SectionIcon = section.icon;
                           return (
                             // FIX: Use strongly typed key to ensure title is a string.
                             <GuideSection key={index} title={t[section.titleKey]} icon={<SectionIcon size={20} className="text-gray-500" />}>
                                <ul>
                                    {section.items.map((item, itemIndex) => (
                                        <li key={itemIndex}>
                                            {/* FIX: Use strongly typed keys to ensure text content is valid ReactNode. */}
                                            <strong>{t[item.strongKey]}</strong> {t[item.textKey]}
                                        </li>
                                    ))}
                                </ul>
                             </GuideSection>
                           )
                        })
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">No results found for "{searchTerm}".</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserGuideModal;