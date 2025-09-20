'use client';

import { useEffect } from 'react';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Fix exports is not defined error
    if (typeof window !== 'undefined') {
      if (typeof window.exports === 'undefined') {
        (window as any).exports = {};
      }
      if (typeof window.module === 'undefined') {
        (window as any).module = { exports: {} };
      }
      if (typeof window.require === 'undefined') {
        (window as any).require = function() { return {}; };
      }
    }
  }, []);

  return <>{children}</>;
}