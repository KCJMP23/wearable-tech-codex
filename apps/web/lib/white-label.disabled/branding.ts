import { createClient } from '@supabase/supabase-js';

export interface BrandAssets {
  logoUrl?: string;
  logoUrlDark?: string;
  faviconUrl?: string;
  appleTouchIconUrl?: string;
  socialShareImageUrl?: string;
  backgroundImageUrl?: string;
  brandMarkUrl?: string; // Small logo without text
}

export interface BrandColors {
  primary: string;
  primaryDark?: string;
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

export interface BrandTypography {
  fontFamily: string;
  headingFont?: string;
  logoFont?: string;
  fontUrl?: string; // Google Fonts or custom font URL
}

export interface BrandMetadata {
  companyName: string;
  tagline?: string;
  description?: string;
  websiteUrl?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  seoDefaults?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}

export interface BrandConfiguration {
  id: string;
  tenantId: string;
  assets: BrandAssets;
  colors: BrandColors;
  typography: BrandTypography;
  metadata: BrandMetadata;
  customCSS?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileSize?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export class BrandingManager {
  private supabase;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get tenant branding configuration
   */
  async getTenantBranding(tenantId: string): Promise<BrandConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error) {
        return this.getDefaultBranding(tenantId);
      }

      return this.transformBrandingData(data);
    } catch (error) {
      console.error('Error fetching tenant branding:', error);
      return this.getDefaultBranding(tenantId);
    }
  }

  /**
   * Update tenant branding configuration
   */
  async updateTenantBranding(
    tenantId: string,
    brandConfig: Partial<BrandConfiguration>
  ): Promise<{ success: boolean; error?: string; brandingId?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_branding')
        .upsert({
          tenant_id: tenantId,
          assets: brandConfig.assets || {},
          colors: brandConfig.colors || this.getDefaultColors(),
          typography: brandConfig.typography || this.getDefaultTypography(),
          metadata: brandConfig.metadata || {},
          custom_css: brandConfig.customCSS,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, brandingId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Upload brand asset (logo, favicon, etc.)
   */
  async uploadBrandAsset(
    tenantId: string,
    file: File,
    assetType: keyof BrandAssets
  ): Promise<AssetUploadResult> {
    try {
      // Validate file
      const validation = await this.validateAssetFile(file, assetType);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${tenantId}/${assetType}-${Date.now()}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('brand-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from('brand-assets')
        .getPublicUrl(data.path);

      // Get image dimensions if it's an image
      const dimensions = await this.getImageDimensions(file);

      // Update tenant branding with new asset URL
      const currentBranding = await this.getTenantBranding(tenantId);
      if (currentBranding) {
        const updatedAssets = {
          ...currentBranding.assets,
          [assetType]: publicUrlData.publicUrl,
        };

        await this.updateTenantBranding(tenantId, {
          assets: updatedAssets,
        });
      }

      return {
        success: true,
        url: publicUrlData.publicUrl,
        fileSize: file.size,
        dimensions,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Remove brand asset
   */
  async removeBrandAsset(
    tenantId: string,
    assetType: keyof BrandAssets
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentBranding = await this.getTenantBranding(tenantId);
      if (!currentBranding) {
        return { success: false, error: 'Branding configuration not found' };
      }

      const assetUrl = currentBranding.assets[assetType];
      if (!assetUrl) {
        return { success: true }; // Nothing to remove
      }

      // Extract file path from URL
      const urlParts = assetUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // tenantId/filename

      // Remove from storage
      const { error: storageError } = await this.supabase.storage
        .from('brand-assets')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage removal error:', storageError);
      }

      // Update branding configuration
      const updatedAssets = { ...currentBranding.assets };
      delete updatedAssets[assetType];

      await this.updateTenantBranding(tenantId, {
        assets: updatedAssets,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate favicon variations
   */
  async generateFaviconVariations(
    tenantId: string,
    sourceFile: File
  ): Promise<{ success: boolean; assets?: Partial<BrandAssets>; error?: string }> {
    try {
      // This would integrate with an image processing service
      // For now, we'll upload the original and simulate variations
      
      const faviconResult = await this.uploadBrandAsset(tenantId, sourceFile, 'faviconUrl');
      if (!faviconResult.success) {
        return { success: false, error: faviconResult.error };
      }

      // In a real implementation, you would:
      // 1. Resize the image to 16x16, 32x32, 180x180 (Apple Touch Icon)
      // 2. Convert to appropriate formats (.ico, .png)
      // 3. Upload each variation

      const assets: Partial<BrandAssets> = {
        faviconUrl: faviconResult.url,
        appleTouchIconUrl: faviconResult.url, // Would be resized version
      };

      return { success: true, assets };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate brand color palette from primary color
   */
  generateColorPalette(primaryColor: string): BrandColors {
    // This is a simplified color palette generator
    // In a real implementation, you'd use a color theory library
    
    const colors: BrandColors = {
      primary: primaryColor,
      primaryDark: this.darkenColor(primaryColor, 20),
      secondary: this.adjustHue(primaryColor, 180),
      accent: this.adjustHue(primaryColor, 30),
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: primaryColor,
    };

    return colors;
  }

  /**
   * Validate asset file
   */
  private async validateAssetFile(
    file: File,
    assetType: keyof BrandAssets
  ): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 5MB' };
    }

    // Check file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPEG, PNG, SVG, and WebP are allowed' };
    }

    // Asset-specific validations
    if (assetType === 'faviconUrl') {
      const dimensions = await this.getImageDimensions(file);
      if (dimensions && (dimensions.width < 16 || dimensions.height < 16)) {
        return { valid: false, error: 'Favicon must be at least 16x16 pixels' };
      }
    }

    if (assetType === 'logoUrl') {
      const dimensions = await this.getImageDimensions(file);
      if (dimensions && (dimensions.width < 100 || dimensions.height < 50)) {
        return { valid: false, error: 'Logo must be at least 100x50 pixels' };
      }
    }

    return { valid: true };
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve(null);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate CSS variables for branding
   */
  generateBrandingCSS(branding: BrandConfiguration): string {
    const variables: string[] = [':root {'];

    // Colors
    Object.entries(branding.colors).forEach(([key, value]) => {
      variables.push(`  --brand-${this.camelToKebab(key)}: ${value};`);
    });

    // Typography
    variables.push(`  --brand-font-family: ${branding.typography.fontFamily};`);
    if (branding.typography.headingFont) {
      variables.push(`  --brand-heading-font: ${branding.typography.headingFont};`);
    }
    if (branding.typography.logoFont) {
      variables.push(`  --brand-logo-font: ${branding.typography.logoFont};`);
    }

    variables.push('}');

    // Add font imports if needed
    if (branding.typography.fontUrl) {
      variables.unshift(`@import url('${branding.typography.fontUrl}');`);
    }

    // Add custom CSS
    if (branding.customCSS) {
      variables.push(branding.customCSS);
    }

    return variables.join('\n');
  }

  /**
   * Transform database branding data
   */
  private transformBrandingData(data: any): BrandConfiguration {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      assets: data.assets || {},
      colors: data.colors || this.getDefaultColors(),
      typography: data.typography || this.getDefaultTypography(),
      metadata: data.metadata || {},
      customCSS: data.custom_css,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get default branding configuration
   */
  private getDefaultBranding(tenantId: string): BrandConfiguration {
    return {
      id: 'default',
      tenantId,
      assets: {},
      colors: this.getDefaultColors(),
      typography: this.getDefaultTypography(),
      metadata: {
        companyName: 'Your Brand',
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private getDefaultColors(): BrandColors {
    return {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
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

  private getDefaultTypography(): BrandTypography {
    return {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
    };
  }

  /**
   * Color manipulation utilities
   */
  private darkenColor(color: string, percent: number): string {
    // Simple color darkening - in production, use a proper color library
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  private adjustHue(color: string, degrees: number): string {
    // Simple hue adjustment - in production, use HSL conversion
    // This is a placeholder implementation
    return color;
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
}

export const brandingManager = new BrandingManager();