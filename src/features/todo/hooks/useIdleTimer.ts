import { useEffect, useRef, useCallback } from 'react';

/**
 * A custom hook to detect user inactivity.
 * @param onIdle The callback function to execute when the user is idle.
 * @param timeout The idle timeout in milliseconds. Defaults to 5 minutes.
 */
const useIdleTimer = (onIdle: () => void, timeout: number = 5 * 60 * 1000) => {
  const timeoutId = useRef<number | null>(null);

  // Function to reset the idle timer
  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      window.clearTimeout(timeoutId.current);
    }
    // Set a new timer only if the document is visible
    if (document.visibilityState === 'visible') {
      timeoutId.current = window.setTimeout(onIdle, timeout);
    }
  }, [onIdle, timeout]);

  // Event handler that resets the timer on any user activity
  const handleEvent = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // List of events that indicate user activity
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

    // Function to handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // If the page is hidden, clear the timer to save resources
        if (timeoutId.current) {
          window.clearTimeout(timeoutId.current);
          timeoutId.current = null;
        }
      } else {
        // When the tab becomes visible again, reset the timer
        resetTimer();
      }
    };

    // Attach event listeners for user activity
    events.forEach(event => window.addEventListener(event, handleEvent));
    // Attach event listener for page visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the initial timer
    resetTimer();

    // Cleanup function to remove listeners and clear the timer on unmount
    return () => {
      events.forEach(event => window.removeEventListener(event, handleEvent));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId.current) {
        window.clearTimeout(timeoutId.current);
      }
    };
  }, [handleEvent, resetTimer]); // Re-run effect if handlers change
};

export default useIdleTimer;
