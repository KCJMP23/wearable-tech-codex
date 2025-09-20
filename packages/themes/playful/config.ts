import { ThemeConfig } from '../src/types';
import { baseThemeConfig } from '../base/config';

export const playfulThemeConfig: ThemeConfig = {
  ...baseThemeConfig,
  id: 'playful',
  name: 'Playful',
  description: 'Fun and vibrant design for lifestyle and entertainment niches',
  category: 'playful',
  tags: ['fun', 'vibrant', 'colorful', 'energetic', 'lifestyle'],
  colors: {
    ...baseThemeConfig.colors,
    primary: '#F97316',
    secondary: '#A855F7',
    accent: '#14B8A6',
    background: '#FFFBF5',
    foreground: '#1F2937',
    muted: '#FEF3C7',
    mutedForeground: '#78716C',
    border: '#FED7AA',
    ring: '#F97316',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
  typography: {
    ...baseThemeConfig.typography,
    fontFamily: {
      sans: 'Fredoka, Comic Neue, -apple-system, sans-serif',
      serif: 'Kalam, cursive',
      mono: 'Space Mono, monospace',
    },
    fontSize: {
      xs: '0.875rem',
      sm: '1rem',
      base: '1.125rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '2rem',
      '3xl': '2.5rem',
      '4xl': '3.5rem',
      '5xl': '4.5rem',
    },
    fontWeight: {
      thin: 300,
      light: 400,
      normal: 500,
      medium: 600,
      semibold: 700,
      bold: 800,
      extrabold: 900,
    },
    lineHeight: {
      tight: '1.35',
      normal: '1.6',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2.5rem',
    xl: '3.5rem',
    '2xl': '5rem',
    '3xl': '7rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 4px rgba(249, 115, 22, 0.1)',
    md: '0 4px 8px rgba(249, 115, 22, 0.15)',
    lg: '0 8px 16px rgba(249, 115, 22, 0.2)',
    xl: '0 16px 32px rgba(249, 115, 22, 0.25)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      easeIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
      easeOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      easeInOut: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  components: {
    button: {
      variants: {
        primary: 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105 transform transition-all shadow-lg',
        secondary: 'bg-purple-500 text-white hover:bg-purple-600 hover:rotate-3 transform transition-all',
        outline: 'border-3 border-orange-500 text-orange-500 hover:bg-orange-50 hover:scale-105',
        ghost: 'hover:bg-yellow-100 text-orange-700',
        destructive: 'bg-red-400 text-white hover:bg-red-500',
      },
      sizes: {
        sm: 'px-4 py-2 text-sm rounded-full',
        md: 'px-6 py-3 text-base rounded-full',
        lg: 'px-8 py-4 text-lg rounded-full',
      },
    },
    card: {
      background: 'bg-white',
      border: 'border-2 border-orange-200',
      shadow: 'shadow-xl',
      radius: 'rounded-2xl',
    },
    navigation: {
      background: 'bg-gradient-to-r from-orange-400 to-purple-500',
      text: 'text-white',
      hover: 'hover:text-yellow-200',
      active: 'text-yellow-300 font-bold',
    },
  },
  customCSS: `
    @keyframes wiggle {
      0%, 100% { transform: rotate(-3deg); }
      50% { transform: rotate(3deg); }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(-5%); }
      50% { transform: translateY(0); }
    }
    .wiggle:hover {
      animation: wiggle 0.5s ease-in-out infinite;
    }
    .bounce-hover:hover {
      animation: bounce 0.5s ease-in-out infinite;
    }
    .fun-gradient {
      background: linear-gradient(135deg, #FED7AA 0%, #C084FC 50%, #86EFAC 100%);
    }
    .bubble-card {
      position: relative;
      overflow: hidden;
    }
    .bubble-card::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(249, 115, 22, 0.1) 20%, transparent 20%);
      background-size: 20px 20px;
      transform: rotate(45deg);
    }
    .sticker-effect {
      position: relative;
      display: inline-block;
      transform: rotate(-2deg);
      transition: transform 0.3s;
    }
    .sticker-effect:hover {
      transform: rotate(2deg) scale(1.1);
    }
  `,
};