import { ThemeConfig } from './types';

export function applyTheme(theme: ThemeConfig, customizations: Record<string, any> = {}) {
  const root = document.documentElement;
  
  // Apply colors
  const colors = { ...theme.colors, ...customizations.colors };
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Apply typography
  const typography = { ...theme.typography, ...customizations.typography };
  if (typography.fontFamily) {
    root.style.setProperty('--font-sans', typography.fontFamily.sans);
    root.style.setProperty('--font-serif', typography.fontFamily.serif);
    root.style.setProperty('--font-mono', typography.fontFamily.mono);
  }

  // Apply spacing
  const spacing = { ...theme.spacing, ...customizations.spacing };
  Object.entries(spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Apply border radius
  const borderRadius = { ...theme.borderRadius, ...customizations.borderRadius };
  Object.entries(borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Apply shadows
  const shadows = { ...theme.shadows, ...customizations.shadows };
  Object.entries(shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Apply custom CSS if provided
  if (theme.customCSS) {
    let styleElement = document.getElementById('theme-custom-css');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-custom-css';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = theme.customCSS;
  }

  // Apply theme ID to body
  document.body.setAttribute('data-theme', theme.id);
}

export function generateThemeCSS(theme: ThemeConfig): string {
  const css: string[] = [];
  
  css.push(':root {');
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    css.push(`  --color-${key}: ${value};`);
  });
  
  // Typography
  if (theme.typography.fontFamily) {
    css.push(`  --font-sans: ${theme.typography.fontFamily.sans};`);
    css.push(`  --font-serif: ${theme.typography.fontFamily.serif};`);
    css.push(`  --font-mono: ${theme.typography.fontFamily.mono};`);
  }
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    css.push(`  --spacing-${key}: ${value};`);
  });
  
  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    css.push(`  --radius-${key}: ${value};`);
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    css.push(`  --shadow-${key}: ${value};`);
  });
  
  css.push('}');
  
  // Custom CSS
  if (theme.customCSS) {
    css.push(theme.customCSS);
  }
  
  return css.join('\n');
}

export function mergeThemeCustomizations(
  theme: ThemeConfig,
  customizations: Record<string, any>
): ThemeConfig {
  return {
    ...theme,
    colors: { ...theme.colors, ...customizations.colors },
    typography: {
      ...theme.typography,
      fontFamily: { ...theme.typography.fontFamily, ...customizations.typography?.fontFamily },
      fontSize: { ...theme.typography.fontSize, ...customizations.typography?.fontSize },
      fontWeight: { ...theme.typography.fontWeight, ...customizations.typography?.fontWeight },
      lineHeight: { ...theme.typography.lineHeight, ...customizations.typography?.lineHeight },
    },
    spacing: { ...theme.spacing, ...customizations.spacing },
    borderRadius: { ...theme.borderRadius, ...customizations.borderRadius },
    shadows: { ...theme.shadows, ...customizations.shadows },
    animations: {
      ...theme.animations,
      duration: { ...theme.animations.duration, ...customizations.animations?.duration },
      easing: { ...theme.animations.easing, ...customizations.animations?.easing },
    },
    layout: {
      ...theme.layout,
      maxWidth: { ...theme.layout.maxWidth, ...customizations.layout?.maxWidth },
      container: { ...theme.layout.container, ...customizations.layout?.container },
      grid: { ...theme.layout.grid, ...customizations.layout?.grid },
    },
    components: { ...theme.components, ...customizations.components },
  };
}

export function validateThemeConfig(config: any): config is ThemeConfig {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.id === 'string' &&
    typeof config.name === 'string' &&
    config.colors &&
    config.typography &&
    config.spacing &&
    config.borderRadius &&
    config.shadows &&
    config.animations &&
    config.layout
  );
}

export function exportThemeConfig(theme: ThemeConfig): string {
  return JSON.stringify(theme, null, 2);
}

export function importThemeConfig(json: string): ThemeConfig | null {
  try {
    const config = JSON.parse(json);
    if (validateThemeConfig(config)) {
      return config;
    }
    return null;
  } catch {
    return null;
  }
}