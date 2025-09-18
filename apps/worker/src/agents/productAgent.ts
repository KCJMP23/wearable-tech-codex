import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';

interface ProductAgentInput {
  tenantId: string;
  action: 'ingest_product' | 'enrich_product' | 'research_products' | 'verify_links' | 'map_taxonomy' | 'update_pricing';
  asin?: string;
  category?: string;
  count?: number;
  keywords?: string[];
  overrideExisting?: boolean;
}

interface ProductData {
  asin: string;
  title: string;
  brand?: string;
  images: Array<{ url: string; alt: string }>;
  features: string[];
  rating?: number;
  reviewCount?: number;
  priceSnapshot?: string;
  currency?: string;
  category?: string;
  subcategory?: string;
  deviceType?: string;
  compatibility?: string[];
  regulatoryNotes?: string;
  healthMetrics?: string[];
  batteryLifeHours?: number;
  waterResistance?: string;
  affiliateUrl: string;
}

export class ProductAgent extends BaseAgent {
  name = 'ProductAgent';
  description = 'Manages product ingestion, enrichment, and Amazon PA-API integration with affiliate tag compliance';
  version = '1.0.0';

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as ProductAgentInput;
      
      switch (input.action) {
        case 'ingest_product':
          return await this.ingestProduct(input.tenantId, input.asin!, deps);
        case 'enrich_product':
          return await this.enrichProduct(input.tenantId, input.asin!, deps);
        case 'research_products':
          return await this.researchProducts(input.tenantId, input.category, input.keywords, input.count, deps);
        case 'verify_links':
          return await this.verifyProductLinks(input.tenantId, deps);
        case 'map_taxonomy':
          return await this.mapProductsToTaxonomy(input.tenantId, deps);
        case 'update_pricing':
          return await this.updateProductPricing(input.tenantId, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async ingestProduct(tenantId: string, asin: string, deps: AgentDependencies): Promise<any> {
    // Check if product already exists
    const { data: existingProduct } = await deps.supabase
      .from('products')
      .select('id, asin, last_verified_at')
      .eq('tenant_id', tenantId)
      .eq('asin', asin)
      .single();

    if (existingProduct) {
      // Update verification timestamp
      await deps.supabase
        .from('products')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', existingProduct.id);

      return { 
        action: 'verified_existing',
        productId: existingProduct.id,
        asin 
      };
    }

    // Fetch product data from Amazon PA-API (mock implementation)
    const productData = await this.fetchProductFromAmazon(asin, deps);
    
    if (!productData) {
      throw new Error(`Could not fetch product data for ASIN: ${asin}`);
    }

    // Ensure affiliate tag is present
    productData.affiliateUrl = this.ensureAmazonTag(
      productData.affiliateUrl, 
      deps.amazonPartnerTag || 'jmpkc01-20'
    );

    // Insert product into database
    const { data: newProduct, error } = await deps.supabase
      .from('products')
      .insert({
        tenant_id: tenantId,
        asin: productData.asin,
        title: productData.title,
        brand: productData.brand,
        images: productData.images,
        features: productData.features,
        rating: productData.rating,
        review_count: productData.reviewCount,
        price_snapshot: productData.priceSnapshot,
        currency: productData.currency || 'USD',
        category: productData.category,
        subcategory: productData.subcategory,
        device_type: productData.deviceType,
        compatibility: productData.compatibility,
        regulatory_notes: productData.regulatoryNotes,
        health_metrics: productData.healthMetrics,
        battery_life_hours: productData.batteryLifeHours,
        water_resistance: productData.waterResistance,
        affiliate_url: productData.affiliateUrl,
        source: 'amazon',
        last_verified_at: new Date().toISOString(),
        raw: productData
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert product: ${error.message}`);
    }

    // Auto-map to taxonomy
    await this.autoMapProductToTaxonomy(tenantId, newProduct.id, productData, deps);

    return {
      action: 'ingested',
      productId: newProduct.id,
      asin: productData.asin,
      title: productData.title
    };
  }

  private async enrichProduct(tenantId: string, asin: string, deps: AgentDependencies): Promise<any> {
    // Get product
    const { data: product } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asin', asin)
      .single();

    if (!product) {
      throw new Error(`Product not found: ${asin}`);
    }

    // Enrich with AI-generated content using OpenAI/Claude
    const enrichments = await this.generateProductEnrichments(product, deps);

    // Update product with enrichments
    const { error } = await deps.supabase
      .from('products')
      .update({
        features: [...(product.features || []), ...enrichments.additionalFeatures],
        regulatory_notes: enrichments.regulatoryNotes,
        health_metrics: enrichments.healthMetrics,
        raw: {
          ...product.raw,
          enrichments: {
            generatedAt: new Date().toISOString(),
            ...enrichments
          }
        }
      })
      .eq('id', product.id);

    if (error) {
      throw new Error(`Failed to enrich product: ${error.message}`);
    }

    return {
      action: 'enriched',
      productId: product.id,
      enrichments: Object.keys(enrichments)
    };
  }

  private async researchProducts(
    tenantId: string, 
    category?: string, 
    keywords?: string[], 
    count: number = 10, 
    deps?: AgentDependencies
  ): Promise<any> {
    // Use web search to find trending products
    const searchResults = await this.searchTrendingProducts(category, keywords, deps!);
    
    const discoveredProducts = [];
    const errors = [];

    for (const result of searchResults.slice(0, count)) {
      try {
        const asin = this.extractAsinFromUrl(result.url);
        if (asin) {
          const ingestion = await this.ingestProduct(tenantId, asin, deps!);
          discoveredProducts.push(ingestion);
        }
      } catch (error) {
        errors.push({
          url: result.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'research_completed',
      productsDiscovered: discoveredProducts.length,
      products: discoveredProducts,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async verifyProductLinks(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get all products for tenant
    const { data: products } = await deps.supabase
      .from('products')
      .select('id, asin, affiliate_url, last_verified_at')
      .eq('tenant_id', tenantId);

    if (!products || products.length === 0) {
      return { action: 'no_products_to_verify' };
    }

    const verificationResults = [];
    const partnerTag = deps.amazonPartnerTag || 'jmpkc01-20';

    for (const product of products) {
      try {
        // Verify affiliate tag is present
        const hasCorrectTag = product.affiliate_url.includes(`tag=${partnerTag}`);
        
        if (!hasCorrectTag) {
          // Fix the affiliate tag
          const correctedUrl = this.ensureAmazonTag(product.affiliate_url, partnerTag);
          
          await deps.supabase
            .from('products')
            .update({ 
              affiliate_url: correctedUrl,
              last_verified_at: new Date().toISOString()
            })
            .eq('id', product.id);

          verificationResults.push({
            productId: product.id,
            asin: product.asin,
            action: 'tag_fixed',
            oldUrl: product.affiliate_url,
            newUrl: correctedUrl
          });
        } else {
          // Just update verification timestamp
          await deps.supabase
            .from('products')
            .update({ last_verified_at: new Date().toISOString() })
            .eq('id', product.id);

          verificationResults.push({
            productId: product.id,
            asin: product.asin,
            action: 'verified_ok'
          });
        }
      } catch (error) {
        verificationResults.push({
          productId: product.id,
          asin: product.asin,
          action: 'verification_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'links_verified',
      totalProducts: products.length,
      results: verificationResults
    };
  }

  private async mapProductsToTaxonomy(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get products without taxonomy mapping
    const { data: unmappedProducts } = await deps.supabase
      .from('products')
      .select('id, title, category, device_type, features')
      .eq('tenant_id', tenantId)
      .is('category', null);

    if (!unmappedProducts || unmappedProducts.length === 0) {
      return { action: 'no_unmapped_products' };
    }

    // Get taxonomy structure
    const { data: taxonomy } = await deps.supabase
      .from('taxonomy')
      .select('*')
      .eq('tenant_id', tenantId);

    const mappingResults = [];

    for (const product of unmappedProducts) {
      try {
        const mapping = await this.autoMapProductToTaxonomy(
          tenantId, 
          product.id, 
          product, 
          deps,
          taxonomy
        );
        mappingResults.push(mapping);
      } catch (error) {
        mappingResults.push({
          productId: product.id,
          action: 'mapping_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'taxonomy_mapping_completed',
      productsMapped: mappingResults.filter(r => r.action === 'mapped').length,
      results: mappingResults
    };
  }

  private async updateProductPricing(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get products that need price updates (older than 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: productsToUpdate } = await deps.supabase
      .from('products')
      .select('id, asin, price_snapshot')
      .eq('tenant_id', tenantId)
      .lt('last_verified_at', yesterday.toISOString())
      .limit(20); // Process in batches

    if (!productsToUpdate || productsToUpdate.length === 0) {
      return { action: 'no_products_need_price_update' };
    }

    const updateResults = [];

    for (const product of productsToUpdate) {
      try {
        // Fetch current price from Amazon (mock implementation)
        const currentPrice = await this.fetchCurrentPrice(product.asin, deps);
        
        if (currentPrice && currentPrice !== product.price_snapshot) {
          await deps.supabase
            .from('products')
            .update({
              price_snapshot: currentPrice,
              last_verified_at: new Date().toISOString()
            })
            .eq('id', product.id);

          updateResults.push({
            productId: product.id,
            asin: product.asin,
            action: 'price_updated',
            oldPrice: product.price_snapshot,
            newPrice: currentPrice
          });
        } else {
          updateResults.push({
            productId: product.id,
            asin: product.asin,
            action: 'price_unchanged'
          });
        }
      } catch (error) {
        updateResults.push({
          productId: product.id,
          asin: product.asin,
          action: 'price_update_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'pricing_update_completed',
      productsProcessed: productsToUpdate.length,
      pricesUpdated: updateResults.filter(r => r.action === 'price_updated').length,
      results: updateResults
    };
  }

  // Helper methods
  private async fetchProductFromAmazon(asin: string, deps: AgentDependencies): Promise<ProductData | null> {
    // Mock implementation - in real implementation, use Amazon PA-API
    // For now, return mock data based on ASIN pattern
    
    const mockProducts: Record<string, Partial<ProductData>> = {
      'B08': { // Apple Watch pattern
        title: 'Apple Watch Series 9',
        brand: 'Apple',
        deviceType: 'smartwatch',
        category: 'Wearables',
        subcategory: 'Smart Watches',
        batteryLifeHours: 18,
        waterResistance: 'WR50',
        healthMetrics: ['heart_rate', 'ecg', 'blood_oxygen', 'sleep_tracking']
      },
      'B09': { // Fitbit pattern
        title: 'Fitbit Versa 4',
        brand: 'Fitbit',
        deviceType: 'fitness_tracker',
        category: 'Wearables',
        subcategory: 'Fitness Trackers',
        batteryLifeHours: 144,
        waterResistance: 'WR50',
        healthMetrics: ['heart_rate', 'sleep_tracking', 'stress_management']
      }
    };

    const pattern = asin.substring(0, 3);
    const mockData = mockProducts[pattern];

    if (!mockData) {
      return null;
    }

    return {
      asin,
      title: mockData.title || `Product ${asin}`,
      brand: mockData.brand,
      images: [
        { url: `https://example.com/images/${asin}-1.jpg`, alt: `${mockData.title} front view` },
        { url: `https://example.com/images/${asin}-2.jpg`, alt: `${mockData.title} side view` }
      ],
      features: [
        'High-quality construction',
        'Latest technology',
        'User-friendly interface'
      ],
      rating: 4.2 + Math.random() * 0.8,
      reviewCount: Math.floor(Math.random() * 5000) + 100,
      priceSnapshot: `$${(99 + Math.random() * 400).toFixed(2)}`,
      currency: 'USD',
      category: mockData.category,
      subcategory: mockData.subcategory,
      deviceType: mockData.deviceType,
      compatibility: ['iOS', 'Android'],
      healthMetrics: mockData.healthMetrics,
      batteryLifeHours: mockData.batteryLifeHours,
      waterResistance: mockData.waterResistance,
      affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=jmpkc01-20`
    };
  }

  private async generateProductEnrichments(product: any, deps: AgentDependencies): Promise<any> {
    // Mock AI enrichment - in real implementation, use OpenAI/Claude
    const enrichments = {
      additionalFeatures: [
        'Advanced sensor technology',
        'Seamless connectivity',
        'Durable design'
      ],
      regulatoryNotes: product.health_metrics?.length > 0 
        ? 'This device is for wellness purposes only and should not be used for medical diagnosis.'
        : undefined,
      healthMetrics: product.device_type === 'smartwatch' 
        ? ['step_counting', 'calorie_tracking', 'activity_monitoring']
        : [],
      useCases: this.generateUseCases(product),
      targetAudience: this.identifyTargetAudience(product)
    };

    return enrichments;
  }

  private generateUseCases(product: any): string[] {
    const useCases = [];
    
    if (product.device_type === 'smartwatch') {
      useCases.push('Daily fitness tracking', 'Professional health monitoring', 'Smart notifications');
    } else if (product.device_type === 'fitness_tracker') {
      useCases.push('Workout tracking', 'Sleep monitoring', 'Goal achievement');
    }
    
    return useCases;
  }

  private identifyTargetAudience(product: any): string[] {
    const audiences = [];
    
    if (product.health_metrics?.includes('heart_rate')) {
      audiences.push('fitness_enthusiasts', 'health_conscious_individuals');
    }
    
    if (product.device_type === 'smartwatch') {
      audiences.push('tech_savvy_users', 'professionals');
    }
    
    return audiences;
  }

  private async searchTrendingProducts(category?: string, keywords?: string[], deps?: AgentDependencies): Promise<any[]> {
    // Mock implementation - in real implementation, use Tavily or web search
    const mockResults = [
      { url: 'https://www.amazon.com/dp/B08DFBWGND', title: 'Popular Smartwatch' },
      { url: 'https://www.amazon.com/dp/B09JQMJK7X', title: 'Trending Fitness Tracker' },
      { url: 'https://www.amazon.com/dp/B08HLGQP5G', title: 'Best Selling Wearable' }
    ];

    return mockResults;
  }

  private extractAsinFromUrl(url: string): string | null {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    return asinMatch ? asinMatch[1] : null;
  }

  private async autoMapProductToTaxonomy(
    tenantId: string, 
    productId: string, 
    productData: any, 
    deps: AgentDependencies,
    taxonomy?: any[]
  ): Promise<any> {
    // Simple mapping logic based on device type and category
    let category = productData.category;
    let subcategory = productData.subcategory;

    if (!category && productData.device_type) {
      const deviceTypeMapping: Record<string, string> = {
        'smartwatch': 'Smart Watches',
        'fitness_tracker': 'Fitness Trackers',
        'blood_pressure_monitor': 'Health Monitors',
        'sleep_tracker': 'Sleep Technology'
      };
      
      category = deviceTypeMapping[productData.device_type] || 'Wearables';
    }

    if (category && !subcategory) {
      subcategory = productData.brand || 'General';
    }

    // Update product with taxonomy mapping
    await deps.supabase
      .from('products')
      .update({
        category,
        subcategory
      })
      .eq('id', productId);

    return {
      productId,
      action: 'mapped',
      category,
      subcategory
    };
  }

  private async fetchCurrentPrice(asin: string, deps: AgentDependencies): Promise<string | null> {
    // Mock implementation - in real implementation, use Amazon PA-API
    return `$${(99 + Math.random() * 400).toFixed(2)}`;
  }
}

export const productAgent = new ProductAgent();