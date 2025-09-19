import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { STORAGE_KEYS } from '../constants';
import { Theme } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { setTheme as setThemeAction } from '../store/slices/appSlice';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  colors: Theme['colors'];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const themePreference = useAppSelector(state => state.app.theme);
  const systemColorScheme = useColorScheme();
  
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const isDark = themePreference === 'dark' || 
      (themePreference === 'auto' && systemColorScheme === 'dark');
    
    return {
      dark: isDark,
      colors: isDark ? Colors.dark : Colors.light,
    };
  });

  // Load theme preference from storage on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when preference or system theme changes
  useEffect(() => {
    const isDark = themePreference === 'dark' || 
      (themePreference === 'auto' && systemColorScheme === 'dark');
    
    setCurrentTheme({
      dark: isDark,
      colors: isDark ? Colors.dark : Colors.light,
    });
  }, [themePreference, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        dispatch(setThemeAction(savedTheme as 'light' | 'dark' | 'auto'));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (theme: 'light' | 'dark' | 'auto') => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = (theme: 'light' | 'dark' | 'auto') => {
    dispatch(setThemeAction(theme));
    saveThemePreference(theme);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme.dark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const contextValue: ThemeContextType = {
    theme: currentTheme,
    isDark: currentTheme.dark,
    toggleTheme,
    setTheme,
    colors: currentTheme.colors,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}