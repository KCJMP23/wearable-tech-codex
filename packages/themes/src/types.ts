export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeTypography {
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeAnimations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface ThemeLayout {
  maxWidth: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  container: {
    padding: string;
  };
  grid: {
    columns: number;
    gap: string;
  };
}

export interface ThemeComponents {
  button?: {
    variants: {
      primary: string;
      secondary: string;
      outline: string;
      ghost: string;
      destructive: string;
    };
    sizes: {
      sm: string;
      md: string;
      lg: string;
    };
  };
  card?: {
    background: string;
    border: string;
    shadow: string;
    radius: string;
  };
  input?: {
    background: string;
    border: string;
    focus: string;
    placeholder: string;
  };
  navigation?: {
    background: string;
    text: string;
    hover: string;
    active: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  thumbnail?: string;
  screenshots?: string[];
  category: 'minimal' | 'magazine' | 'boutique' | 'professional' | 'playful' | 'custom';
  tags: string[];
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  layout: ThemeLayout;
  components?: ThemeComponents;
  customCSS?: string;
  settings?: {
    [key: string]: {
      type: 'color' | 'select' | 'number' | 'text' | 'boolean';
      label: string;
      description?: string;
      default: any;
      options?: { value: string; label: string }[];
      min?: number;
      max?: number;
    };
  };
}

export interface ThemeManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
  keywords?: string[];
  category: string;
  thumbnail?: string;
  screenshots?: string[];
  compatible: {
    minVersion: string;
    maxVersion?: string;
  };
  dependencies?: {
    [key: string]: string;
  };
  config: string;
  styles?: string[];
  scripts?: string[];
  assets?: {
    images?: string[];
    fonts?: string[];
    icons?: string[];
  };
}