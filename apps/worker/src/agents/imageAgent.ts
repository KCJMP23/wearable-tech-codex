import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';
import { createOpenAIClient } from '../lib/openai';
import { createSearchClient } from '../lib/search';

interface ImageAgentInput {
  tenantId: string;
  action: 'generate_images' | 'optimize_images' | 'create_thumbnails' | 'add_watermarks' | 'analyze_performance' | 'source_images' | 'create_mockups';
  postId?: string;
  productId?: string;
  imageUrls?: string[];
  specifications?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpg' | 'png' | 'webp' | 'avif';
  };
  requirements?: {
    count: number;
    style: 'product' | 'lifestyle' | 'comparison' | 'infographic' | 'hero' | 'banner';
    topics: string[];
    keywords?: string[];
  };
}

interface ImageData {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  optimized?: boolean;
  source: 'generated' | 'sourced' | 'stock' | 'product';
  attribution?: string;
  metadata?: {
    description: string;
    keywords: string[];
    usage: string[];
    style: string;
  };
}

interface ImageOptimization {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  qualityScore: number;
  performanceGain: string;
}

export class ImageAgent extends BaseAgent {
  name = 'ImageAgent';
  description = 'Manages image sourcing, generation, optimization, and processing for content and products';
  version = '1.0.0';

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as ImageAgentInput;
      
      switch (input.action) {
        case 'generate_images':
          return await this.generateImages(input.tenantId, input.requirements!, deps);
        case 'optimize_images':
          return await this.optimizeImages(input.tenantId, input.imageUrls!, input.specifications, deps);
        case 'create_thumbnails':
          return await this.createThumbnails(input.tenantId, input.imageUrls!, deps);
        case 'add_watermarks':
          return await this.addWatermarks(input.tenantId, input.imageUrls!, deps);
        case 'analyze_performance':
          return await this.analyzeImagePerformance(input.tenantId, input.postId, deps);
        case 'source_images':
          return await this.sourceImages(input.tenantId, input.requirements!, deps);
        case 'create_mockups':
          return await this.createMockups(input.tenantId, input.productId!, input.specifications, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async generateImages(
    tenantId: string,
    requirements: ImageAgentInput['requirements'],
    deps: AgentDependencies
  ): Promise<any> {
    if (!requirements) {
      throw new Error('Image requirements are required');
    }

    const generatedImages = [];
    const errors = [];

    // Get tenant branding
    const tenantData = await this.getTenantBranding(tenantId, deps);

    for (let i = 0; i < requirements.count; i++) {
      try {
        const imageData = await this.generateSingleImage(
          requirements.topics[i % requirements.topics.length],
          requirements.style,
          tenantData,
          deps
        );
        
        generatedImages.push(imageData);
      } catch (error) {
        errors.push({
          index: i,
          topic: requirements.topics[i % requirements.topics.length],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Store generated images metadata
    if (generatedImages.length > 0) {
      await this.storeImageMetadata(tenantId, generatedImages, deps);
    }

    return {
      action: 'images_generated',
      imagesCreated: generatedImages.length,
      images: generatedImages,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async sourceImages(
    tenantId: string,
    requirements: ImageAgentInput['requirements'],
    deps: AgentDependencies
  ): Promise<any> {
    if (!requirements) {
      throw new Error('Image requirements are required');
    }

    const sourcedImages = [];
    const errors = [];

    for (const topic of requirements.topics) {
      try {
        // Search for relevant images
        const images = await this.searchStockImages(topic, requirements.style, deps);
        const selectedImages = images.slice(0, Math.ceil(requirements.count / requirements.topics.length));
        
        for (const image of selectedImages) {
          const processedImage = await this.processSourcedImage(image, requirements.style, deps);
          sourcedImages.push(processedImage);
        }
      } catch (error) {
        errors.push({
          topic,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Store sourced images metadata
    if (sourcedImages.length > 0) {
      await this.storeImageMetadata(tenantId, sourcedImages, deps);
    }

    return {
      action: 'images_sourced',
      imagesFound: sourcedImages.length,
      images: sourcedImages,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async optimizeImages(
    tenantId: string,
    imageUrls: string[],
    specifications?: ImageAgentInput['specifications'],
    deps?: AgentDependencies
  ): Promise<any> {
    const optimizations = [];
    const errors = [];

    const defaultSpecs = {
      quality: 85,
      format: 'webp' as const,
      width: 1200,
      height: 800
    };

    const specs = { ...defaultSpecs, ...specifications };

    for (const imageUrl of imageUrls) {
      try {
        const optimization = await this.optimizeSingleImage(imageUrl, specs, deps!);
        optimizations.push(optimization);
      } catch (error) {
        errors.push({
          imageUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate overall performance improvement
    const totalOriginalSize = optimizations.reduce((sum, opt) => sum + opt.originalSize, 0);
    const totalOptimizedSize = optimizations.reduce((sum, opt) => sum + opt.optimizedSize, 0);
    const overallSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100;

    return {
      action: 'images_optimized',
      imagesProcessed: optimizations.length,
      overallSavings: `${overallSavings.toFixed(1)}%`,
      totalSizeBefore: `${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
      totalSizeAfter: `${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`,
      optimizations,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async createThumbnails(
    tenantId: string,
    imageUrls: string[],
    deps: AgentDependencies
  ): Promise<any> {
    const thumbnails = [];
    const errors = [];

    const thumbnailSizes = [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 600, height: 400 }
    ];

    for (const imageUrl of imageUrls) {
      try {
        const imageThumbnails = [];
        
        for (const size of thumbnailSizes) {
          const thumbnail = await this.createSingleThumbnail(imageUrl, size, deps);
          imageThumbnails.push(thumbnail);
        }

        thumbnails.push({
          originalUrl: imageUrl,
          thumbnails: imageThumbnails
        });
      } catch (error) {
        errors.push({
          imageUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'thumbnails_created',
      imagesProcessed: thumbnails.length,
      thumbnailsGenerated: thumbnails.reduce((sum, img) => sum + img.thumbnails.length, 0),
      thumbnails,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async addWatermarks(
    tenantId: string,
    imageUrls: string[],
    deps: AgentDependencies
  ): Promise<any> {
    // Get tenant branding for watermark
    const tenantData = await this.getTenantBranding(tenantId, deps);
    
    const watermarkedImages = [];
    const errors = [];

    for (const imageUrl of imageUrls) {
      try {
        const watermarkedImage = await this.addWatermarkToImage(imageUrl, tenantData, deps);
        watermarkedImages.push(watermarkedImage);
      } catch (error) {
        errors.push({
          imageUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'watermarks_added',
      imagesProcessed: watermarkedImages.length,
      watermarkedImages,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async analyzeImagePerformance(
    tenantId: string,
    postId?: string,
    deps?: AgentDependencies
  ): Promise<any> {
    let query = deps!.supabase
      .from('posts')
      .select('id, title, images, published_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'published');

    if (postId) {
      query = query.eq('id', postId);
    }

    const { data: posts } = await query.limit(20);

    if (!posts || posts.length === 0) {
      return { action: 'no_posts_to_analyze' };
    }

    const analysis = {
      totalPosts: posts.length,
      totalImages: 0,
      averageImagesPerPost: 0,
      imageSizeAnalysis: {
        optimal: 0,
        oversized: 0,
        undersized: 0
      },
      formatDistribution: {} as Record<string, number>,
      performance: {
        loadTimeEstimate: '0s',
        seoScore: 0,
        accessibilityScore: 0
      },
      recommendations: [] as string[]
    };

    for (const post of posts) {
      const images = post.images || [];
      analysis.totalImages += images.length;

      for (const image of images) {
        // Analyze image properties
        await this.analyzeImageProperties(image, analysis);
      }
    }

    analysis.averageImagesPerPost = analysis.totalImages / analysis.totalPosts;
    analysis.performance = this.calculatePerformanceMetrics(analysis);
    analysis.recommendations = this.generateImageRecommendations(analysis);

    return {
      action: 'image_performance_analyzed',
      ...analysis
    };
  }

  private async createMockups(
    tenantId: string,
    productId: string,
    specifications?: ImageAgentInput['specifications'],
    deps?: AgentDependencies
  ): Promise<any> {
    // Get product data
    const { data: product } = await deps!.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .single();

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const mockupTypes = [
      'lifestyle_fitness',
      'lifestyle_office',
      'product_showcase',
      'comparison_chart',
      'feature_highlight'
    ];

    const mockups = [];

    for (const mockupType of mockupTypes) {
      try {
        const mockup = await this.createSingleMockup(product, mockupType, specifications, deps!);
        mockups.push(mockup);
      } catch (error) {
        console.warn(`Failed to create ${mockupType} mockup:`, error);
      }
    }

    // Store mockups in product images
    if (mockups.length > 0) {
      const updatedImages = [...(product.images || []), ...mockups];
      
      await deps!.supabase
        .from('products')
        .update({ images: updatedImages })
        .eq('id', productId);
    }

    return {
      action: 'mockups_created',
      productId,
      mockupsGenerated: mockups.length,
      mockups
    };
  }

  // Helper methods
  private async getTenantBranding(tenantId: string, deps: AgentDependencies): Promise<any> {
    const { data: tenant } = await deps.supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    return {
      name: tenant?.name || 'Wearable Tech Review',
      logo: tenant?.logo_url,
      colors: tenant?.color_tokens || {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#F59E0B'
      },
      domain: tenant?.domain || 'example.com'
    };
  }

  private async generateSingleImage(
    topic: string,
    style: string,
    tenantData: any,
    deps: AgentDependencies
  ): Promise<ImageData> {
    // In real implementation, this would use AI image generation (DALL-E, Midjourney, etc.)
    // For now, return mock data
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockUrl = `https://example.com/generated/${imageId}.jpg`;

    return {
      id: imageId,
      url: mockUrl,
      alt: `${topic} - ${style} style image`,
      caption: `High-quality ${style} image showcasing ${topic}`,
      width: 1200,
      height: 800,
      fileSize: 245760, // ~240KB
      format: 'jpg',
      optimized: true,
      source: 'generated',
      metadata: {
        description: `Generated image for ${topic} in ${style} style`,
        keywords: [topic, style, 'wearable', 'technology'],
        usage: ['blog_post', 'social_media', 'thumbnail'],
        style
      }
    };
  }

  private async searchStockImages(
    topic: string,
    style: string,
    deps: AgentDependencies
  ): Promise<any[]> {
    // Mock implementation - in real version, integrate with Unsplash, Pexels, etc.
    return [
      {
        id: 'stock_1',
        url: 'https://images.unsplash.com/photo-example1',
        alt: `${topic} stock photo`,
        width: 1920,
        height: 1280,
        photographer: 'John Doe',
        source: 'Unsplash'
      },
      {
        id: 'stock_2',
        url: 'https://images.pexels.com/photo-example2',
        alt: `${topic} lifestyle photo`,
        width: 1600,
        height: 1067,
        photographer: 'Jane Smith',
        source: 'Pexels'
      }
    ];
  }

  private async processSourcedImage(
    sourceImage: any,
    style: string,
    deps: AgentDependencies
  ): Promise<ImageData> {
    return {
      id: sourceImage.id,
      url: sourceImage.url,
      alt: sourceImage.alt,
      caption: `${style} image - ${sourceImage.alt}`,
      width: sourceImage.width,
      height: sourceImage.height,
      fileSize: this.estimateFileSize(sourceImage.width, sourceImage.height),
      format: 'jpg',
      source: 'stock',
      attribution: `Photo by ${sourceImage.photographer} on ${sourceImage.source}`,
      metadata: {
        description: sourceImage.alt,
        keywords: this.extractImageKeywords(sourceImage.alt),
        usage: ['blog_post'],
        style
      }
    };
  }

  private async optimizeSingleImage(
    imageUrl: string,
    specifications: any,
    deps: AgentDependencies
  ): Promise<ImageOptimization> {
    // Mock optimization - in real implementation, use image processing libraries
    const originalSize = Math.floor(Math.random() * 2000000) + 500000; // 0.5-2.5MB
    const compressionRatio = 0.3 + (Math.random() * 0.4); // 30-70% compression
    const optimizedSize = Math.floor(originalSize * compressionRatio);

    return {
      originalSize,
      optimizedSize,
      compressionRatio: (1 - compressionRatio) * 100,
      qualityScore: 85 + Math.random() * 10,
      performanceGain: this.calculatePerformanceGain(originalSize, optimizedSize)
    };
  }

  private calculatePerformanceGain(originalSize: number, optimizedSize: number): string {
    const savings = ((originalSize - optimizedSize) / originalSize) * 100;
    const loadTimeImprovement = (savings / 100) * 2; // Rough estimate
    
    return `${savings.toFixed(1)}% size reduction, ~${loadTimeImprovement.toFixed(1)}s faster load time`;
  }

  private async createSingleThumbnail(
    imageUrl: string,
    size: { name: string; width: number; height: number },
    deps: AgentDependencies
  ): Promise<any> {
    // Mock thumbnail creation
    return {
      name: size.name,
      url: `${imageUrl.replace('.jpg', '')}_${size.name}.jpg`,
      width: size.width,
      height: size.height,
      fileSize: this.estimateFileSize(size.width, size.height, 0.8) // Higher compression for thumbnails
    };
  }

  private async addWatermarkToImage(
    imageUrl: string,
    tenantData: any,
    deps: AgentDependencies
  ): Promise<any> {
    // Mock watermarking
    return {
      originalUrl: imageUrl,
      watermarkedUrl: imageUrl.replace('.jpg', '_watermarked.jpg'),
      watermarkStyle: 'subtle_corner',
      watermarkText: tenantData.name,
      opacity: 0.7
    };
  }

  private async storeImageMetadata(
    tenantId: string,
    images: ImageData[],
    deps: AgentDependencies
  ): Promise<void> {
    // Store image metadata for future reference and analytics
    const metadata = images.map(image => ({
      tenant_id: tenantId,
      image_id: image.id,
      url: image.url,
      metadata: {
        ...image.metadata,
        fileSize: image.fileSize,
        format: image.format,
        dimensions: `${image.width}x${image.height}`,
        source: image.source
      },
      created_at: new Date().toISOString()
    }));

    try {
      await deps.supabase
        .from('image_metadata')
        .insert(metadata);
    } catch (error) {
      console.warn('Failed to store image metadata:', error);
    }
  }

  private async analyzeImageProperties(image: any, analysis: any): Promise<void> {
    // Analyze image size category
    if (image.width && image.height) {
      const pixelCount = image.width * image.height;
      if (pixelCount > 2000000) { // > 2MP
        analysis.imageSizeAnalysis.oversized++;
      } else if (pixelCount < 300000) { // < 0.3MP
        analysis.imageSizeAnalysis.undersized++;
      } else {
        analysis.imageSizeAnalysis.optimal++;
      }
    }

    // Track format distribution
    const format = image.url?.split('.').pop()?.toLowerCase() || 'unknown';
    analysis.formatDistribution[format] = (analysis.formatDistribution[format] || 0) + 1;
  }

  private calculatePerformanceMetrics(analysis: any): any {
    const avgLoadTime = (analysis.imageSizeAnalysis.oversized * 3) + 
                       (analysis.imageSizeAnalysis.optimal * 1.5) + 
                       (analysis.imageSizeAnalysis.undersized * 0.5);
    
    const seoScore = Math.min(100, 70 + (analysis.imageSizeAnalysis.optimal / analysis.totalImages) * 30);
    const accessibilityScore = 85; // Based on alt text analysis

    return {
      loadTimeEstimate: `${(avgLoadTime / analysis.totalImages).toFixed(1)}s`,
      seoScore: Math.round(seoScore),
      accessibilityScore
    };
  }

  private generateImageRecommendations(analysis: any): string[] {
    const recommendations = [];

    if (analysis.imageSizeAnalysis.oversized > analysis.totalImages * 0.3) {
      recommendations.push('Optimize oversized images to improve page load speed');
    }

    if (analysis.formatDistribution.webp === undefined) {
      recommendations.push('Consider using WebP format for better compression');
    }

    if (analysis.averageImagesPerPost < 2) {
      recommendations.push('Add more images to improve engagement');
    } else if (analysis.averageImagesPerPost > 6) {
      recommendations.push('Consider reducing image count to improve load speed');
    }

    if (analysis.performance.seoScore < 80) {
      recommendations.push('Improve image alt text and file names for better SEO');
    }

    return recommendations.length > 0 ? recommendations : ['Image optimization is on track'];
  }

  private async createSingleMockup(
    product: any,
    mockupType: string,
    specifications?: any,
    deps?: AgentDependencies
  ): Promise<ImageData> {
    const mockupId = `mockup_${mockupType}_${Date.now()}`;
    
    const mockupTemplates = {
      lifestyle_fitness: {
        description: `${product.title} being used during a fitness workout`,
        keywords: ['fitness', 'workout', 'lifestyle', 'active'],
        scene: 'gym or outdoor exercise setting'
      },
      lifestyle_office: {
        description: `${product.title} in a professional office environment`,
        keywords: ['office', 'professional', 'workplace', 'business'],
        scene: 'modern office desk setup'
      },
      product_showcase: {
        description: `Clean product shot of ${product.title} highlighting key features`,
        keywords: ['product', 'features', 'showcase', 'clean'],
        scene: 'minimal studio background'
      },
      comparison_chart: {
        description: `Comparison chart featuring ${product.title} vs competitors`,
        keywords: ['comparison', 'vs', 'features', 'specs'],
        scene: 'infographic style layout'
      },
      feature_highlight: {
        description: `Close-up shots highlighting specific features of ${product.title}`,
        keywords: ['features', 'details', 'close-up', 'specs'],
        scene: 'detailed product photography'
      }
    };

    const template = mockupTemplates[mockupType as keyof typeof mockupTemplates];

    return {
      id: mockupId,
      url: `https://example.com/mockups/${mockupId}.jpg`,
      alt: template.description,
      caption: `${mockupType.replace('_', ' ')} mockup for ${product.title}`,
      width: specifications?.width || 1200,
      height: specifications?.height || 800,
      fileSize: this.estimateFileSize(1200, 800),
      format: specifications?.format || 'jpg',
      source: 'generated',
      metadata: {
        description: template.description,
        keywords: [...template.keywords, product.title.toLowerCase()],
        usage: ['product_page', 'blog_post', 'social_media'],
        style: mockupType
      }
    };
  }

  private estimateFileSize(width: number, height: number, quality: number = 0.85): number {
    // Rough estimate: pixels * 3 bytes per pixel * quality factor
    return Math.floor(width * height * 3 * quality);
  }

  private extractImageKeywords(alt: string): string[] {
    return alt.toLowerCase()
      .split(/[\s,.-]+/)
      .filter(word => word.length > 2)
      .slice(0, 5);
  }
}

export const imageAgent = new ImageAgent();