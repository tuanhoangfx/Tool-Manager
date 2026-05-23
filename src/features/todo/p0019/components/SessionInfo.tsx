// @ts-nocheck


import React, { useState, useEffect, useRef } from 'react';
import { GlobeIcon, ClockIcon } from '@/components/Icons';
import { useSettings } from '@/context/SettingsContext';

const SessionInfo: React.FC = () => {
  const { t } = useSettings();
  const [ip, setIp] = useState('...');
  // State to hold the total active seconds
  const [sessionTimeSeconds, setSessionTimeSeconds] = useState(0); 
  
  // Ref to hold the interval ID
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetch('https://api.ipify.org?format=json', { signal })
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch((err) => {
        if (err.name !== 'AbortError') {
            setIp('Unavailable');
        }
      });
      
      return () => {
        controller.abort();
      };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden, clear the interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Page is visible, start the interval if it's not already running
        if (!intervalRef.current) {
          intervalRef.current = window.setInterval(() => {
            setSessionTimeSeconds(prevSeconds => prevSeconds + 1);
          }, 1000);
        }
      }
    };

    // Set the initial interval only if the page is visible
    if (document.visibilityState === 'visible') {
      intervalRef.current = window.setInterval(() => {
        setSessionTimeSeconds(prevSeconds => prevSeconds + 1);
      }, 1000);
    }
    
    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  // Format the time for display
  const formatSessionTime = (totalSeconds: number) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex items-center space-x-4 text-xs">
      <div className="flex items-center space-x-1.5">
        <GlobeIcon size={16} className="text-[var(--accent-color)]" />
        {/* FIX: Correct translation key was added to types and translations files */}
        <span>{t.ipAddress}:</span>
        <span className="font-mono">{ip}</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <ClockIcon size={16} className="text-[var(--accent-color)]" />
        {/* FIX: Correct translation key was added to types and translations files */}
        <span>{t.sessionTime}:</span>
        <span className="font-mono">{formatSessionTime(sessionTimeSeconds)}</span>
      </div>
    </div>
  );
};

export default React.memo(SessionInfo);