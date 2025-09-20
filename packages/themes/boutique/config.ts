import { ThemeConfig } from '../src/types';
import { baseThemeConfig } from '../base/config';

export const boutiqueThemeConfig: ThemeConfig = {
  ...baseThemeConfig,
  id: 'boutique',
  name: 'Boutique',
  description: 'Elegant and sophisticated design for premium affiliate sites',
  category: 'boutique',
  tags: ['elegant', 'premium', 'luxury', 'sophisticated', 'fashion'],
  colors: {
    ...baseThemeConfig.colors,
    primary: '#8B5CF6',
    secondary: '#EC4899',
    accent: '#F472B6',
    background: '#FAFAF8',
    foreground: '#2D2D2D',
    muted: '#F5F5F0',
    mutedForeground: '#6B6B6B',
    border: '#E5E5E0',
    ring: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
  },
  typography: {
    ...baseThemeConfig.typography,
    fontFamily: {
      sans: 'Playfair Display, Georgia, serif',
      serif: 'Cormorant Garamond, Georgia, serif',
      mono: 'Courier Prime, monospace',
    },
    fontSize: {
      ...baseThemeConfig.typography.fontSize,
      base: '1rem',
      lg: '1.125rem',
      xl: '1.375rem',
      '2xl': '1.75rem',
      '3xl': '2.25rem',
      '4xl': '3rem',
      '5xl': '4rem',
    },
    fontWeight: {
      ...baseThemeConfig.typography.fontWeight,
      normal: 300,
      medium: 400,
      semibold: 500,
      bold: 600,
    },
    lineHeight: {
      tight: '1.3',
      normal: '1.6',
      relaxed: '1.85',
    },
  },
  spacing: {
    xs: '0.375rem',
    sm: '0.75rem',
    md: '1.25rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 4px rgba(139, 92, 246, 0.05)',
    md: '0 4px 12px rgba(139, 92, 246, 0.08)',
    lg: '0 8px 24px rgba(139, 92, 246, 0.1)',
    xl: '0 16px 48px rgba(139, 92, 246, 0.12)',
  },
  animations: {
    duration: {
      fast: '200ms',
      normal: '400ms',
      slow: '600ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  components: {
    button: {
      variants: {
        primary: 'bg-purple-500 text-white hover:bg-purple-600 transition-all transform hover:scale-105',
        secondary: 'bg-pink-500 text-white hover:bg-pink-600 transition-all',
        outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-50',
        ghost: 'hover:bg-purple-50 text-purple-700',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      sizes: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
    },
    card: {
      background: 'bg-white',
      border: 'border border-purple-100',
      shadow: 'shadow-lg hover:shadow-xl transition-shadow',
      radius: 'rounded-lg',
    },
    navigation: {
      background: 'bg-white/95 backdrop-blur-sm',
      text: 'text-gray-700',
      hover: 'hover:text-purple-600',
      active: 'text-purple-600 font-medium',
    },
  },
  customCSS: `
    .gradient-text {
      background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .boutique-hero {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%);
    }
    .product-hover {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .product-hover:hover {
      transform: translateY(-4px);
    }
  `,
};