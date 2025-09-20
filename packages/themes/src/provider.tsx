'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeConfig } from './types';
import { baseThemeConfig } from '../base/config';
import { applyTheme } from './utils';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  customizations: Record<string, any>;
  setCustomizations: (customizations: Record<string, any>) => void;
  preview: boolean;
  setPreview: (preview: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeConfig;
  initialCustomizations?: Record<string, any>;
}

export function ThemeProvider({
  children,
  initialTheme = baseThemeConfig,
  initialCustomizations = {},
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeConfig>(initialTheme);
  const [customizations, setCustomizations] = useState<Record<string, any>>(initialCustomizations);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    // Apply theme to document
    applyTheme(theme, customizations);
  }, [theme, customizations]);

  useEffect(() => {
    // Add preview class to body if in preview mode
    if (preview) {
      document.body.classList.add('theme-preview');
    } else {
      document.body.classList.remove('theme-preview');
    }
  }, [preview]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        customizations,
        setCustomizations,
        preview,
        setPreview,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}