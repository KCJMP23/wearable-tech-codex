'use client';

import { useEffect } from 'react';

/**
 * Suppresses non-critical console errors in development
 * Only use this in development to reduce noise from expected errors
 */
export function ConsoleErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // List of error patterns to suppress
      const suppressedPatterns = [
        /favicon/i,
        /404/i,
        /DevTools/i,
        /Failed to fetch/i,
        /NetworkError/i,
        /ResizeObserver/i,
        /Non-Error promise rejection/i,
        /ReactDOM.render/i,
        /findDOMNode is deprecated/i,
        /Can't perform a React state update/i,
        /Expected server HTML/i,
        /Hydration failed/i,
        /There was an error while hydrating/i,
        /Text content does not match/i,
        /did not match/i,
        /Extra attributes from the server/i,
        /Missing env variables/i,
        /Supabase client/i,
        /NEXT_PUBLIC_/i,
        /WebSocket connection/i,
        /Failed to load resource/i,
        /net::ERR_/i,
      ];
      
      // Suppress specific console errors
      console.error = (...args) => {
        const message = args.join(' ');
        const shouldSuppress = suppressedPatterns.some(pattern => 
          pattern.test(message)
        );
        
        if (!shouldSuppress) {
          originalError.apply(console, args);
        }
      };
      
      // Suppress specific console warnings
      console.warn = (...args) => {
        const message = args.join(' ');
        const shouldSuppress = suppressedPatterns.some(pattern => 
          pattern.test(message)
        );
        
        if (!shouldSuppress) {
          originalWarn.apply(console, args);
        }
      };
      
      // Suppress unhandled promise rejections for known issues
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason?.toString() || '';
        const shouldSuppress = suppressedPatterns.some(pattern => 
          pattern.test(reason)
        );
        
        if (shouldSuppress) {
          event.preventDefault();
        }
      };
      
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      // Cleanup
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);
  
  return null;
}