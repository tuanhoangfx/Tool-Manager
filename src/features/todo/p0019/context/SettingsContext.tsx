// @ts-nocheck


import React from 'react';
import { translations } from '@/translations';
import { Translation, Task } from '@/types';

export type ColorScheme = 'sky' | 'amethyst' | 'sunset' | 'emerald' | 'crimson';

// Define the shape of the context data
export interface SettingsContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  language: keyof typeof translations;
  setLanguage: (lang: keyof typeof translations) => void;
  t: Translation;
  defaultDueDateOffset: number;
  setDefaultDueDateOffset: (offset: number) => void;
  defaultPriority: Task['priority'];
  setDefaultPriority: (priority: Task['priority']) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

// Create the context with an undefined initial value
export const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

// Custom hook for consuming the context, which provides better type safety and error handling
export const useSettings = (): SettingsContextType => {
    const context = React.useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};