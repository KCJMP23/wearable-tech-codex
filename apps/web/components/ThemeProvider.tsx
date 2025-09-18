'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeTokens {
  accent: string;
  background: string;
  text: string;
  muted: string;
}

interface ThemeContextValue {
  tokens: ThemeTokens;
  setTokens: (tokens: ThemeTokens) => void;
}

const DEFAULT_THEME: ThemeTokens = {
  accent: '#F29F80',
  background: '#F8F6F2',
  text: '#1F1B16',
  muted: '#AEA59D'
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_THEME);

  useEffect(() => {
    document.body.style.setProperty('--accent', tokens.accent);
    document.body.style.setProperty('--background', tokens.background);
    document.body.style.setProperty('--text', tokens.text);
    document.body.style.setProperty('--muted', tokens.muted);
  }, [tokens]);

  const value = useMemo(() => ({ tokens, setTokens }), [tokens]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeTokens(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeTokens must be used within the ThemeProvider');
  }
  return ctx;
}
