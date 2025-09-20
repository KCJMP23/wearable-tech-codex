import { ThemeConfig } from '../src/types';
import { baseThemeConfig } from '../base/config';

export const minimalThemeConfig: ThemeConfig = {
  ...baseThemeConfig,
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean and minimalist design focused on content clarity',
  category: 'minimal',
  tags: ['minimal', 'clean', 'simple', 'content-focused', 'white-space'],
  colors: {
    ...baseThemeConfig.colors,
    primary: '#000000',
    secondary: '#666666',
    accent: '#000000',
    background: '#FFFFFF',
    foreground: '#000000',
    muted: '#FAFAFA',
    mutedForeground: '#999999',
    border: '#EEEEEE',
    ring: '#000000',
  },
  typography: {
    ...baseThemeConfig.typography,
    fontFamily: {
      sans: 'Helvetica Neue, Arial, sans-serif',
      serif: 'Georgia, serif',
      mono: 'Monaco, Courier New, monospace',
    },
  },
  spacing: {
    ...baseThemeConfig.spacing,
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
  },
  borderRadius: {
    ...baseThemeConfig.borderRadius,
    sm: '0',
    md: '0',
    lg: '0',
  },
  shadows: {
    sm: 'none',
    md: '0 1px 3px rgba(0,0,0,0.12)',
    lg: '0 2px 8px rgba(0,0,0,0.08)',
    xl: '0 4px 16px rgba(0,0,0,0.08)',
  },
  components: {
    button: {
      variants: {
        primary: 'bg-black text-white hover:bg-gray-800',
        secondary: 'bg-white text-black border border-black hover:bg-gray-50',
        outline: 'border-2 border-black hover:bg-black hover:text-white',
        ghost: 'hover:bg-gray-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      sizes: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3',
        lg: 'px-8 py-4 text-lg',
      },
    },
    card: {
      background: 'bg-white',
      border: 'border border-gray-200',
      shadow: 'none',
      radius: 'rounded-none',
    },
    navigation: {
      background: 'bg-white',
      text: 'text-black',
      hover: 'hover:text-gray-600',
      active: 'text-black border-b-2 border-black',
    },
  },
};