import { createClient } from '@supabase/supabase-js';
import { ThemeConfig } from './theme-overrides';
import { BrandConfiguration } from './branding';

export interface CSSInjectionConfig {
  id: string;
  tenantId: string;
  scope: 'global' | 'component' | 'page';
  target?: string; // component name or page path
  css: string;
  variables: Record<string, string>;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicCSS {
  variables: string;
  global: string;
  components: string;
  pages: Record<string, string>;
}

export interface CSSVariableMap {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borders: Record<string, string>;
  shadows: Record<string, string>;
  animations: Record<string, string>;
  custom: Record<string, string>;
}

export class CSSInjector {
  private supabase;
  private cache: Map<string, DynamicCSS> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Generate complete CSS for tenant
   */
  async generateTenantCSS(tenantId: string): Promise<DynamicCSS> {
    // Check cache first
    const cached = this.getCachedCSS(tenantId);
    if (cached) {
      return cached;
    }

    try {
      // Get all CSS components
      const [theme, branding, injections] = await Promise.all([
        this.getTenantTheme(tenantId),
        this.getTenantBranding(tenantId),
        this.getCSSInjections(tenantId),
      ]);

      // Generate CSS variables
      const variables = this.generateCSSVariables(theme, branding);

      // Generate component and page-specific CSS
      const { global, components, pages } = this.compileCSSInjections(injections);

      const dynamicCSS: DynamicCSS = {
        variables,
        global,
        components,
        pages,
      };

      // Cache the result
      this.setCachedCSS(tenantId, dynamicCSS);

      return dynamicCSS;
    } catch (error) {
      console.error('Error generating tenant CSS:', error);
      return this.getDefaultCSS();
    }
  }

  /**
   * Get CSS for specific page
   */
  async getPageCSS(tenantId: string, pagePath: string): Promise<string> {
    const tenantCSS = await this.generateTenantCSS(tenantId);
    
    const cssComponents = [
      tenantCSS.variables,
      tenantCSS.global,
      tenantCSS.components,
    ];

    // Add page-specific CSS if available
    if (tenantCSS.pages[pagePath]) {
      cssComponents.push(tenantCSS.pages[pagePath]);
    }

    return cssComponents.filter(Boolean).join('\n\n');
  }

  /**
   * Generate CSS variables from theme and branding
   */
  generateCSSVariables(
    theme?: ThemeConfig | null,
    branding?: BrandConfiguration | null
  ): string {
    const variables: string[] = [':root {'];

    if (theme) {
      // Theme colors
      Object.entries(theme.colors).forEach(([key, value]) => {
        variables.push(`  --theme-${this.camelToKebab(key)}: ${value};`);
      });

      // Typography
      variables.push(`  --theme-font-family: ${theme.typography.fontFamily};`);
      if (theme.typography.headingFont) {
        variables.push(`  --theme-heading-font: ${theme.typography.headingFont};`);
      }

      Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
        variables.push(`  --theme-font-size-${key}: ${value};`);
      });

      Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
        variables.push(`  --theme-font-weight-${key}: ${value};`);
      });

      // Spacing
      Object.entries(theme.spacing).forEach(([key, value]) => {
        variables.push(`  --theme-spacing-${key}: ${value};`);
      });

      // Border radius
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        variables.push(`  --theme-border-radius-${key}: ${value};`);
      });

      // Shadows
      Object.entries(theme.shadows).forEach(([key, value]) => {
        variables.push(`  --theme-shadow-${key}: ${value};`);
      });
    }

    if (branding) {
      // Brand colors (override theme colors)
      Object.entries(branding.colors).forEach(([key, value]) => {
        variables.push(`  --brand-${this.camelToKebab(key)}: ${value};`);
      });

      // Brand typography
      variables.push(`  --brand-font-family: ${branding.typography.fontFamily};`);
      if (branding.typography.headingFont) {
        variables.push(`  --brand-heading-font: ${branding.typography.headingFont};`);
      }
      if (branding.typography.logoFont) {
        variables.push(`  --brand-logo-font: ${branding.typography.logoFont};`);
      }

      // Brand assets
      if (branding.assets.logoUrl) {
        variables.push(`  --brand-logo-url: url('${branding.assets.logoUrl}');`);
      }
      if (branding.assets.faviconUrl) {
        variables.push(`  --brand-favicon-url: url('${branding.assets.faviconUrl}');`);
      }
      if (branding.assets.backgroundImageUrl) {
        variables.push(`  --brand-background-image: url('${branding.assets.backgroundImageUrl}');`);
      }
    }

    variables.push('}');

    // Add font imports
    if (branding?.typography.fontUrl) {
      variables.unshift(`@import url('${branding.typography.fontUrl}');`);
    }

    return variables.join('\n');
  }

  /**
   * Add CSS injection for tenant
   */
  async addCSSInjection(
    tenantId: string,
    config: Omit<CSSInjectionConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; error?: string; injectionId?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('css_injections')
        .insert({
          tenant_id: tenantId,
          scope: config.scope,
          target: config.target,
          css: config.css,
          variables: config.variables,
          priority: config.priority,
          is_active: config.isActive,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Invalidate cache
      this.invalidateCache(tenantId);

      return { success: true, injectionId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update CSS injection
   */
  async updateCSSInjection(
    injectionId: string,
    config: Partial<CSSInjectionConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: injection, error: fetchError } = await this.supabase
        .from('css_injections')
        .select('tenant_id')
        .eq('id', injectionId)
        .single();

      if (fetchError) {
        return { success: false, error: 'Injection not found' };
      }

      const { error } = await this.supabase
        .from('css_injections')
        .update({
          scope: config.scope,
          target: config.target,
          css: config.css,
          variables: config.variables,
          priority: config.priority,
          is_active: config.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', injectionId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Invalidate cache
      this.invalidateCache(injection.tenant_id);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Remove CSS injection
   */
  async removeCSSInjection(injectionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: injection, error: fetchError } = await this.supabase
        .from('css_injections')
        .select('tenant_id')
        .eq('id', injectionId)
        .single();

      if (fetchError) {
        return { success: false, error: 'Injection not found' };
      }

      const { error } = await this.supabase
        .from('css_injections')
        .delete()
        .eq('id', injectionId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Invalidate cache
      this.invalidateCache(injection.tenant_id);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get all CSS injections for tenant
   */
  async getCSSInjections(tenantId: string): Promise<CSSInjectionConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('css_injections')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        return [];
      }

      return data.map(this.transformCSSInjectionData);
    } catch (error) {
      console.error('Error fetching CSS injections:', error);
      return [];
    }
  }

  /**
   * Compile CSS injections into organized structure
   */
  private compileCSSInjections(injections: CSSInjectionConfig[]): {
    global: string;
    components: string;
    pages: Record<string, string>;
  } {
    const global: string[] = [];
    const components: string[] = [];
    const pages: Record<string, string[]> = {};

    injections.forEach((injection) => {
      // Add variable definitions if any
      if (Object.keys(injection.variables).length > 0) {
        const variableCSS = this.generateVariableCSS(injection.variables);
        global.push(variableCSS);
      }

      // Add main CSS based on scope
      switch (injection.scope) {
        case 'global':
          global.push(injection.css);
          break;
        case 'component':
          components.push(this.wrapComponentCSS(injection.target, injection.css));
          break;
        case 'page':
          if (injection.target) {
            if (!pages[injection.target]) {
              pages[injection.target] = [];
            }
            pages[injection.target].push(injection.css);
          }
          break;
      }
    });

    return {
      global: global.join('\n\n'),
      components: components.join('\n\n'),
      pages: Object.fromEntries(
        Object.entries(pages).map(([path, cssArray]) => [path, cssArray.join('\n\n')])
      ),
    };
  }

  /**
   * Generate CSS from variables
   */
  private generateVariableCSS(variables: Record<string, string>): string {
    const cssVars: string[] = [':root {'];
    
    Object.entries(variables).forEach(([key, value]) => {
      cssVars.push(`  --${key}: ${value};`);
    });
    
    cssVars.push('}');
    return cssVars.join('\n');
  }

  /**
   * Wrap component CSS with appropriate selectors
   */
  private wrapComponentCSS(componentName?: string, css?: string): string {
    if (!componentName || !css) return '';

    // If CSS already has selectors, don't wrap
    if (css.includes('{')) {
      return css;
    }

    // Wrap in component class
    return `.${componentName} {\n${css}\n}`;
  }

  /**
   * Cache management
   */
  private getCachedCSS(tenantId: string): DynamicCSS | null {
    const cached = this.cache.get(tenantId);
    const expiry = this.cacheExpiry.get(tenantId);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    return null;
  }

  private setCachedCSS(tenantId: string, css: DynamicCSS): void {
    this.cache.set(tenantId, css);
    this.cacheExpiry.set(tenantId, Date.now() + this.CACHE_DURATION);
  }

  private invalidateCache(tenantId: string): void {
    this.cache.delete(tenantId);
    this.cacheExpiry.delete(tenantId);
  }

  /**
   * Get tenant theme (simplified)
   */
  private async getTenantTheme(tenantId: string): Promise<ThemeConfig | null> {
    try {
      const { themeOverrideManager } = await import('./theme-overrides');
      return await themeOverrideManager.getTenantTheme(tenantId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get tenant branding (simplified)
   */
  private async getTenantBranding(tenantId: string): Promise<BrandConfiguration | null> {
    try {
      const { brandingManager } = await import('./branding');
      return await brandingManager.getTenantBranding(tenantId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform database data
   */
  private transformCSSInjectionData(data: any): CSSInjectionConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      scope: data.scope,
      target: data.target,
      css: data.css,
      variables: data.variables || {},
      priority: data.priority,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get default CSS
   */
  private getDefaultCSS(): DynamicCSS {
    return {
      variables: ':root { --theme-primary: #3b82f6; }',
      global: '',
      components: '',
      pages: {},
    };
  }

  /**
   * Convert camelCase to kebab-case
   */
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Minify CSS (simple implementation)
   */
  minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove last semicolon before closing brace
      .replace(/\s*{\s*/g, '{') // Remove space around opening brace
      .replace(/;\s*/g, ';') // Remove space after semicolon
      .replace(/,\s*/g, ',') // Remove space after comma
      .trim();
  }

  /**
   * Validate CSS syntax
   */
  validateCSS(css: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation checks
    const openBraces = (css.match(/{/g) || []).length;
    const closeBraces = (css.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
    }

    // Check for common CSS syntax errors
    if (css.includes(';;')) {
      errors.push('Double semicolons found');
    }

    if (css.match(/[^a-zA-Z0-9-_\s:.#(),%'"\/]/)) {
      errors.push('Invalid characters detected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract CSS variables from string
   */
  extractCSSVariables(css: string): Record<string, string> {
    const variables: Record<string, string> = {};
    const variableRegex = /--([a-zA-Z0-9-_]+):\s*([^;]+);/g;
    
    let match;
    while ((match = variableRegex.exec(css)) !== null) {
      variables[match[1]] = match[2].trim();
    }

    return variables;
  }

  /**
   * Apply CSS variables to content
   */
  applyCSSVariables(css: string, variables: Record<string, string>): string {
    let processedCSS = css;

    Object.entries(variables).forEach(([name, value]) => {
      const regex = new RegExp(`var\\(--${name}\\)`, 'g');
      processedCSS = processedCSS.replace(regex, value);
    });

    return processedCSS;
  }
}

export const cssInjector = new CSSInjector();