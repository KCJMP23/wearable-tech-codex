import { useContext } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

// This is a fallback hook for when ThemeProvider context is not available
export function useTheme() {
  const colorScheme = useColorScheme();
  
  return {
    colors: colorScheme === 'dark' ? Colors.dark : Colors.light,
    isDark: colorScheme === 'dark',
  };
}