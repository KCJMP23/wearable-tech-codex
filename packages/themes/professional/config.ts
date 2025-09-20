import { ThemeConfig } from '../src/types';
import { baseThemeConfig } from '../base/config';

export const professionalThemeConfig: ThemeConfig = {
  ...baseThemeConfig,
  id: 'professional',
  name: 'Professional',
  description: 'Corporate and trustworthy design for B2B affiliate sites',
  category: 'professional',
  tags: ['corporate', 'business', 'enterprise', 'trustworthy', 'b2b'],
  colors: {
    ...baseThemeConfig.colors,
    primary: '#0F766E',
    secondary: '#1E40AF',
    accent: '#0891B2',
    background: '#FFFFFF',
    foreground: '#0F172A',
    muted: '#F1F5F9',
    mutedForeground: '#475569',
    border: '#CBD5E1',
    ring: '#0F766E',
    success: '#16A34A',
    warning: '#EA580C',
    error: '#DC2626',
    info: '#0284C7',
  },
  typography: {
    ...baseThemeConfig.typography,
    fontFamily: {
      sans: 'IBM Plex Sans, -apple-system, sans-serif',
      serif: 'IBM Plex Serif, Georgia, serif',
      mono: 'IBM Plex Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.5rem',
      '5xl': '3rem',
    },
    fontWeight: {
      thin: 100,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
  },
  layout: {
    ...baseThemeConfig.layout,
    maxWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px',
      full: '100%',
    },
    container: {
      padding: '1.5rem',
    },
    grid: {
      columns: 12,
      gap: '1.5rem',
    },
  },
  components: {
    button: {
      variants: {
        primary: 'bg-teal-700 text-white hover:bg-teal-800 font-medium',
        secondary: 'bg-blue-800 text-white hover:bg-blue-900 font-medium',
        outline: 'border-2 border-teal-700 text-teal-700 hover:bg-teal-50',
        ghost: 'hover:bg-slate-100 text-slate-700',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
      },
      sizes: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    card: {
      background: 'bg-white',
      border: 'border border-slate-200',
      shadow: 'shadow-sm',
      radius: 'rounded-md',
    },
    navigation: {
      background: 'bg-slate-900',
      text: 'text-slate-100',
      hover: 'hover:text-teal-400',
      active: 'text-teal-400 font-semibold',
    },
  },
  customCSS: `
    .professional-header {
      border-bottom: 3px solid var(--color-primary);
    }
    .data-table {
      border-collapse: separate;
      border-spacing: 0;
    }
    .data-table th {
      background-color: #F8FAFC;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .metric-card {
      border-left: 4px solid var(--color-primary);
    }
    .trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: #F0FDF4;
      border: 1px solid #86EFAC;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      color: #14532D;
    }
  `,
};