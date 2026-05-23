// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, CheckIcon, SettingsIcon } from '@/components/Icons';
import { translations, languageOptions } from '@/translations';
import { useSettings, ColorScheme } from '@/context/SettingsContext';

const colorThemes: { name: ColorScheme, from: string, to: string }[] = [
    { name: 'sky', from: 'from-sky-500', to: 'to-indigo-600' },
    { name: 'amethyst', from: 'from-violet-600', to: 'to-gray-800' },
    { name: 'sunset', from: 'from-orange-500', to: 'to-rose-600' },
    { name: 'emerald', from: 'from-emerald-500', to: 'to-emerald-700' },
    { name: 'crimson', from: 'from-red-600', to: 'to-gray-800' },
];

const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Hanoi (GMT+7)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'America/Chicago', label: 'Chicago (CST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
];

const SettingsController: React.FC = () => {
  const {
    theme,
    setTheme,
    colorScheme,
    setColorScheme,
    language,
    setLanguage,
    t,
    timezone,
    setTimezone,
  } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleLanguageChange = (langId: keyof typeof translations) => {
    setLanguage(langId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        aria-label={t.settingsAria}
        className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <SettingsIcon size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 animate-fadeIn p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.themeLabel}</label>
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1">
              <button onClick={() => setTheme('light')} className={`w-1/2 flex justify-center items-center gap-2 py-1 text-sm rounded-full ${theme === 'light' ? 'bg-white shadow' : ''}`}><SunIcon size={16}/> {t.lightTheme}</button>
              <button onClick={() => setTheme('dark')} className={`w-1/2 flex justify-center items-center gap-2 py-1 text-sm rounded-full ${theme === 'dark' ? 'bg-gray-800 text-white shadow' : ''}`}><MoonIcon size={16}/> {t.darkTheme}</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.accentColorLabel}</label>
            <div className="flex items-center gap-3">
              {colorThemes.map(ct => (
                <button key={ct.name} onClick={() => setColorScheme(ct.name)} className={`w-8 h-8 rounded-full bg-gradient-to-br ${ct.from} ${ct.to} flex items-center justify-center`}>
                  {colorScheme === ct.name && <CheckIcon size={16} className="text-white"/>}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="language" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.language}</label>
            <select id="language" value={language} onChange={e => handleLanguageChange(e.target.value as keyof typeof translations)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm">
                {languageOptions.map(lang => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.timezone}</label>
            <select id="timezone" value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm">
                {timezones.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>

        </div>
      )}
    </div>
  );
};

export default SettingsController;