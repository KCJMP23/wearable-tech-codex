import { ThemeConfig } from '../src/types';
import { baseThemeConfig } from '../base/config';

export const magazineThemeConfig: ThemeConfig = {
  ...baseThemeConfig,
  id: 'magazine',
  name: 'Magazine',
  description: 'Editorial-style layout perfect for content-rich affiliate sites',
  category: 'magazine',
  tags: ['editorial', 'content', 'blog', 'news', 'article-focused'],
  colors: {
    ...baseThemeConfig.colors,
    primary: '#DC2626',
    secondary: '#1E293B',
    accent: '#F59E0B',
    background: '#FFFFFF',
    foreground: '#1E293B',
    muted: '#F8FAFC',
    mutedForeground: '#64748B',
    border: '#E2E8F0',
    ring: '#DC2626',
  },
  typography: {
    ...baseThemeConfig.typography,
    fontFamily: {
      sans: 'Merriweather Sans, -apple-system, sans-serif',
      serif: 'Merriweather, Georgia, serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      ...baseThemeConfig.typography.fontSize,
      base: '1.125rem',
      lg: '1.25rem',
      xl: '1.5rem',
    },
    lineHeight: {
      tight: '1.4',
      normal: '1.65',
      relaxed: '1.8',
    },
  },
  layout: {
    ...baseThemeConfig.layout,
    maxWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1600px',
      full: '100%',
    },
    grid: {
      columns: 12,
      gap: '2rem',
    },
  },
  components: {
    button: {
      variants: {
        primary: 'bg-red-600 text-white hover:bg-red-700 uppercase tracking-wider',
        secondary: 'bg-slate-800 text-white hover:bg-slate-900',
        outline: 'border-2 border-red-600 text-red-600 hover:bg-red-50',
        ghost: 'hover:bg-gray-100 uppercase tracking-wider',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
      },
      sizes: {
        sm: 'px-3 py-1.5 text-xs font-bold',
        md: 'px-5 py-2.5 text-sm font-bold',
        lg: 'px-7 py-3.5 text-base font-bold',
      },
    },
    card: {
      background: 'bg-white',
      border: 'border-t-4 border-t-red-600 shadow-lg',
      shadow: 'shadow-lg',
      radius: 'rounded-none',
    },
    navigation: {
      background: 'bg-slate-900',
      text: 'text-white',
      hover: 'hover:text-red-400',
      active: 'text-red-500 font-bold',
    },
  },
  customCSS: `
    .article-dropcap::first-letter {
      float: left;
      font-size: 5rem;
      line-height: 0.8;
      margin: 0.1em 0.1em 0 0;
      font-weight: bold;
      color: var(--color-primary);
    }
    .column-layout {
      column-count: 2;
      column-gap: 2rem;
    }
    @media (max-width: 768px) {
      .column-layout {
        column-count: 1;
      }
    }
  `,
};