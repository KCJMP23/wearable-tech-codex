import { createClient } from '@supabase/supabase-js';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeTypography {
  fontFamily: string;
  headingFont?: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
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
  xl: string;
  full: string;
}

export interface ThemeConfig {
  id: string;
  tenantId: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: Record<string, string>;
  animations: Record<string, string>;
  customCSS?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentOverride {
  component: string;
  variant?: string;
  styles: Record<string, any>;
  responsive?: {
    mobile?: Record<string, any>;
    tablet?: Record<string, any>;
    desktop?: Record<string, any>;
  };
}

export interface ThemeOverride {
  id: string;
  tenantId: string;
  themeId: string;
  components: ComponentOverride[];
  globalStyles: Record<string, any>;
  cssVariables: Record<string, string>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class ThemeOverrideManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get tenant's active theme configuration
   */
  async getTenantTheme(tenantId: string): Promise<ThemeConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_themes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error) {
        // Return default theme if no custom theme found
        return this.getDefaultTheme();
      }

      return this.transformThemeData(data);
    } catch (error) {
      console.error('Error fetching tenant theme:', error);
      return this.getDefaultTheme();
    }
  }

  /**
   * Get theme overrides for tenant
   */
  async getThemeOverrides(tenantId: string): Promise<ThemeOverride | null> {
    try {
      const { data, error } = await this.supabase
        .from('theme_overrides')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching theme overrides:', error);
      return null;
    }
  }

  /**
   * Create or update tenant theme
   */
  async updateTenantTheme(
    tenantId: string,
    themeConfig: Partial<ThemeConfig>
  ): Promise<{ success: boolean; error?: string; themeId?: string }> {
    try {
      // Deactivate existing themes
      await this.supabase
        .from('tenant_themes')
        .update({ is_active: false })
        .eq('tenant_id', tenantId);

      // Create new theme
      const { data, error } = await this.supabase
        .from('tenant_themes')
        .insert({
          tenant_id: tenantId,
          name: themeConfig.name || 'Custom Theme',
          colors: themeConfig.colors || this.getDefaultColors(),
          typography: themeConfig.typography || this.getDefaultTypography(),
          spacing: themeConfig.spacing || this.getDefaultSpacing(),
          border_radius: themeConfig.borderRadius || this.getDefaultBorderRadius(),
          shadows: themeConfig.shadows || this.getDefaultShadows(),
          animations: themeConfig.animations || this.getDefaultAnimations(),
          custom_css: themeConfig.customCSS,
          is_default: false,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, themeId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update theme overrides
   */
  async updateThemeOverrides(
    tenantId: string,
    overrides: Partial<ThemeOverride>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('theme_overrides')
        .upsert({
          tenant_id: tenantId,
          theme_id: overrides.themeId,
          components: overrides.components || [],
          global_styles: overrides.globalStyles || {},
          css_variables: overrides.cssVariables || {},
          metadata: overrides.metadata || {},
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate CSS variables from theme config
   */
  generateCSSVariables(theme: ThemeConfig, overrides?: ThemeOverride): string {
    const variables: string[] = [':root {'];

    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables.push(`  --color-${key}: ${value};`);
    });

    // Typography
    variables.push(`  --font-family: ${theme.typography.fontFamily};`);
    if (theme.typography.headingFont) {
      variables.push(`  --font-heading: ${theme.typography.headingFont};`);
    }

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      variables.push(`  --font-size-${key}: ${value};`);
    });

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      variables.push(`  --font-weight-${key}: ${value};`);
    });

    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      variables.push(`  --line-height-${key}: ${value};`);
    });

    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables.push(`  --spacing-${key}: ${value};`);
    });

    // Border radius
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      variables.push(`  --border-radius-${key}: ${value};`);
    });

    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables.push(`  --shadow-${key}: ${value};`);
    });

    // Override variables
    if (overrides?.cssVariables) {
      Object.entries(overrides.cssVariables).forEach(([key, value]) => {
        variables.push(`  --${key}: ${value};`);
      });
    }

    variables.push('}');

    return variables.join('\n');
  }

  /**
   * Generate component-specific CSS from overrides
   */
  generateComponentCSS(overrides: ThemeOverride): string {
    const cssRules: string[] = [];

    overrides.components.forEach((component) => {
      const selector = component.variant 
        ? `.${component.component}--${component.variant}`
        : `.${component.component}`;

      cssRules.push(`${selector} {`);
      
      Object.entries(component.styles).forEach(([property, value]) => {
        const cssProperty = this.camelToKebab(property);
        cssRules.push(`  ${cssProperty}: ${value};`);
      });

      cssRules.push('}');

      // Responsive styles
      if (component.responsive) {
        if (component.responsive.mobile) {
          cssRules.push(`@media (max-width: 768px) {`);
          cssRules.push(`  ${selector} {`);
          Object.entries(component.responsive.mobile).forEach(([property, value]) => {
            const cssProperty = this.camelToKebab(property);
            cssRules.push(`    ${cssProperty}: ${value};`);
          });
          cssRules.push('  }');
          cssRules.push('}');
        }

        if (component.responsive.tablet) {
          cssRules.push(`@media (min-width: 769px) and (max-width: 1024px) {`);
          cssRules.push(`  ${selector} {`);
          Object.entries(component.responsive.tablet).forEach(([property, value]) => {
            const cssProperty = this.camelToKebab(property);
            cssRules.push(`    ${cssProperty}: ${value};`);
          });
          cssRules.push('  }');
          cssRules.push('}');
        }

        if (component.responsive.desktop) {
          cssRules.push(`@media (min-width: 1025px) {`);
          cssRules.push(`  ${selector} {`);
          Object.entries(component.responsive.desktop).forEach(([property, value]) => {
            const cssProperty = this.camelToKebab(property);
            cssRules.push(`    ${cssProperty}: ${value};`);
          });
          cssRules.push('  }');
          cssRules.push('}');
        }
      }
    });

    // Global styles
    Object.entries(overrides.globalStyles).forEach(([selector, styles]) => {
      cssRules.push(`${selector} {`);
      Object.entries(styles as Record<string, any>).forEach(([property, value]) => {
        const cssProperty = this.camelToKebab(property);
        cssRules.push(`  ${cssProperty}: ${value};`);
      });
      cssRules.push('}');
    });

    return cssRules.join('\n');
  }

  /**
   * Get available theme templates
   */
  async getThemeTemplates(): Promise<ThemeConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('theme_templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data.map(this.transformThemeData);
    } catch (error) {
      console.error('Error fetching theme templates:', error);
      return [];
    }
  }

  /**
   * Clone theme template for tenant
   */
  async cloneThemeTemplate(
    tenantId: string,
    templateId: string,
    customizations: Partial<ThemeConfig> = {}
  ): Promise<{ success: boolean; error?: string; themeId?: string }> {
    try {
      const { data: template, error: templateError } = await this.supabase
        .from('theme_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) {
        return { success: false, error: 'Template not found' };
      }

      const themeData = {
        ...template,
        ...customizations,
        tenant_id: tenantId,
        is_template: false,
        is_default: false,
        is_active: true,
      };

      delete themeData.id;
      delete themeData.created_at;
      delete themeData.updated_at;

      // Deactivate existing themes
      await this.supabase
        .from('tenant_themes')
        .update({ is_active: false })
        .eq('tenant_id', tenantId);

      const { data, error } = await this.supabase
        .from('tenant_themes')
        .insert(themeData)
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, themeId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Transform database theme data
   */
  private transformThemeData(data: any): ThemeConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      colors: data.colors,
      typography: data.typography,
      spacing: data.spacing,
      borderRadius: data.border_radius,
      shadows: data.shadows,
      animations: data.animations,
      customCSS: data.custom_css,
      isDefault: data.is_default,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Convert camelCase to kebab-case
   */
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Get default theme configuration
   */
  private getDefaultTheme(): ThemeConfig {
    return {
      id: 'default',
      tenantId: '',
      name: 'Default Theme',
      colors: this.getDefaultColors(),
      typography: this.getDefaultTypography(),
      spacing: this.getDefaultSpacing(),
      borderRadius: this.getDefaultBorderRadius(),
      shadows: this.getDefaultShadows(),
      animations: this.getDefaultAnimations(),
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private getDefaultColors(): ThemeColors {
    return {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    };
  }

  private getDefaultTypography(): ThemeTypography {
    return {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
      },
    };
  }

  private getDefaultSpacing(): ThemeSpacing {
    return {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
    };
  }

  private getDefaultBorderRadius(): ThemeBorderRadius {
    return {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    };
  }

  private getDefaultShadows(): Record<string, string> {
    return {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    };
  }

  private getDefaultAnimations(): Record<string, string> {
    return {
      'fade-in': 'fadeIn 0.3s ease-in-out',
      'slide-up': 'slideUp 0.3s ease-out',
      'scale': 'scale 0.2s ease-in-out',
    };
  }
}

export const themeOverrideManager = new ThemeOverrideManager();