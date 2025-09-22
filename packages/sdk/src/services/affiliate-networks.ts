import { createClient } from '../supabase/server.js';
import type { Database } from '../database.types.js';

// Network-specific configuration types
export interface NetworkCredentials {
  shareASale?: {
    affiliateId: string;
    apiToken: string;
    apiSecret: string;
  };
  cjAffiliate?: {
    websiteId: string;
    developerKey: string;
  };
  rakuten?: {
    accountId: string;
    authToken: string;
  };
  impact?: {
    accountSid: string;
    authToken: string;
    campaignId: string;
  };
  amazon?: {
    accessKey: string;
    secretKey: string;
    partnerId: string;
    marketplace: string;
  };
}

export interface NetworkProduct {
  networkId: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  merchantName: string;
  merchantId: string;
  category: string;
  commissionRate: number;
  commissionType: 'percentage' | 'fixed';
  cookieDuration: number;
  inStock: boolean;
  features?: string[];
  rating?: number;
  reviewCount?: number;
}

export interface NetworkCommission {
  networkId: string;
  merchantId: string;
  merchantName: string;
  baseCommission: number;
  bonusCommission?: number;
  effectiveRate: number;
  cookieDuration: number;
  reverseRate?: number;
  minimumPayout?: number;
  paymentTerms?: string;
}

export interface CrossNetworkMatch {
  productName: string;
  matches: {
    network: string;
    product: NetworkProduct;
    commission: NetworkCommission;
    score: number; // Matching confidence 0-100
  }[];
  bestNetwork: string;
  reasoning: string;
}

export class AffiliateNetworkService {
  private getSupabase() {
    return createClient();
  }

  // Network Configuration Management
  async saveNetworkCredentials(
    tenantId: string,
    network: string,
    credentials: Partial<NetworkCredentials>
  ) {
    const supabase = this.getSupabase();
    
    // Encrypt sensitive data before storage
    const encryptedCredentials = this.encryptCredentials(credentials);
    
    const { data, error } = await supabase
      .from('affiliate_networks')
      .upsert({
        tenant_id: tenantId,
        network_id: network,
        credentials: encryptedCredentials,
        active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save network credentials: ${error.message}`);
    return data;
  }

  async getActiveNetworks(tenantId: string) {
    const supabase = this.getSupabase();
    
    const { data, error } = await supabase
      .from('affiliate_networks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (error) throw new Error(`Failed to get active networks: ${error.message}`);
    return data;
  }

  // ShareASale Integration
  async searchShareASale(
    credentials: NetworkCredentials['shareASale'],
    query: string,
    category?: string
  ): Promise<NetworkProduct[]> {
    if (!credentials) throw new Error('ShareASale credentials not configured');

    const apiUrl = 'https://api.shareasale.com/x.cfm';
    const params = new URLSearchParams({
      action: 'productSearch',
      affiliateId: credentials.affiliateId,
      token: credentials.apiToken,
      keyword: query,
      ...(category && { category })
    });

    // Generate signature for ShareASale API
    const signature = this.generateShareASaleSignature(
      credentials.apiSecret,
      params.toString()
    );
    params.append('signature', signature);

    try {
      const response = await fetch(`${apiUrl}?${params}`);
      const data = await response.text();
      return this.parseShareASaleProducts(data);
    } catch (error) {
      console.error('ShareASale API error:', error);
      return [];
    }
  }

  private parseShareASaleProducts(xmlData: string): NetworkProduct[] {
    // Parse XML response from ShareASale
    const products: NetworkProduct[] = [];
    
    // Simple XML parsing (in production, use a proper XML parser)
    const productMatches = xmlData.matchAll(/<product>(.*?)<\/product>/gs);
    
    for (const match of productMatches) {
      const productXml = match[1];
      const product: NetworkProduct = {
        networkId: 'shareASale',
        productId: this.extractXmlValue(productXml, 'productId') || '',
        name: this.extractXmlValue(productXml, 'name') || '',
        description: this.extractXmlValue(productXml, 'description') || '',
        price: parseFloat(this.extractXmlValue(productXml, 'price') || '0'),
        currency: this.extractXmlValue(productXml, 'currency') || 'USD',
        imageUrl: this.extractXmlValue(productXml, 'thumbnail') || '',
        productUrl: this.extractXmlValue(productXml, 'URL') || '',
        merchantName: this.extractXmlValue(productXml, 'merchantName') || '',
        merchantId: this.extractXmlValue(productXml, 'merchantId') || '',
        category: this.extractXmlValue(productXml, 'category') || '',
        commissionRate: parseFloat(this.extractXmlValue(productXml, 'commission') || '0'),
        commissionType: 'percentage',
        cookieDuration: parseInt(this.extractXmlValue(productXml, 'cookieDuration') || '30'),
        inStock: this.extractXmlValue(productXml, 'inStock') === 'true'
      };
      products.push(product);
    }
    
    return products;
  }

  // CJ Affiliate (Commission Junction) Integration
  async searchCJAffiliate(
    credentials: NetworkCredentials['cjAffiliate'],
    query: string,
    category?: string
  ): Promise<NetworkProduct[]> {
    if (!credentials) throw new Error('CJ Affiliate credentials not configured');

    const apiUrl = 'https://product-search.api.cj.com/v2/product-search';
    const headers = {
      'Authorization': `Bearer ${credentials.developerKey}`
    };

    const params = new URLSearchParams({
      'website-id': credentials.websiteId,
      'keywords': query,
      'records-per-page': '50',
      ...(category && { 'advertiser-category': category })
    });

    try {
      const response = await fetch(`${apiUrl}?${params}`, { headers });
      const data = await response.json();
      return this.parseCJProducts(data);
    } catch (error) {
      console.error('CJ Affiliate API error:', error);
      return [];
    }
  }

  private parseCJProducts(data: any): NetworkProduct[] {
    if (!data.products) return [];
    
    return data.products.map((item: any) => ({
      networkId: 'cjAffiliate',
      productId: item['product-id'],
      name: item['product-name'],
      description: item['description'],
      price: parseFloat(item['price'] || 0),
      currency: item['currency'] || 'USD',
      imageUrl: item['image-url'],
      productUrl: item['buy-url'],
      merchantName: item['advertiser-name'],
      merchantId: item['advertiser-id'],
      category: item['advertiser-category'],
      commissionRate: parseFloat(item['sale-commission'] || 0),
      commissionType: 'percentage',
      cookieDuration: 30, // CJ default
      inStock: item['in-stock'] !== 'false'
    }));
  }

  // Rakuten Advertising Integration
  async searchRakuten(
    credentials: NetworkCredentials['rakuten'],
    query: string,
    category?: string
  ): Promise<NetworkProduct[]> {
    if (!credentials) throw new Error('Rakuten credentials not configured');

    const apiUrl = 'https://api.rakutenadvertising.com/products/1.0';
    const headers = {
      'Authorization': `Bearer ${credentials.authToken}`,
      'Accept': 'application/json'
    };

    const params = new URLSearchParams({
      account: credentials.accountId,
      keyword: query,
      max: '50',
      ...(category && { cat: category })
    });

    try {
      const response = await fetch(`${apiUrl}?${params}`, { headers });
      const data = await response.json();
      return this.parseRakutenProducts(data);
    } catch (error) {
      console.error('Rakuten API error:', error);
      return [];
    }
  }

  private parseRakutenProducts(data: any): NetworkProduct[] {
    if (!data.products) return [];
    
    return data.products.map((item: any) => ({
      networkId: 'rakuten',
      productId: item.sku,
      name: item.productName,
      description: item.description,
      price: item.price?.value || 0,
      currency: item.price?.currency || 'USD',
      imageUrl: item.imageUrl,
      productUrl: item.linkUrl,
      merchantName: item.merchantName,
      merchantId: item.mid,
      category: item.primaryCategory,
      commissionRate: item.commissionRate || 0,
      commissionType: 'percentage',
      cookieDuration: item.cookieLength || 30,
      inStock: item.available
    }));
  }

  // Impact Radius Integration
  async searchImpact(
    credentials: NetworkCredentials['impact'],
    query: string,
    category?: string
  ): Promise<NetworkProduct[]> {
    if (!credentials) throw new Error('Impact credentials not configured');

    const apiUrl = `https://api.impact.com/Advertisers/${credentials.accountSid}/Campaigns/${credentials.campaignId}/Products`;
    const headers = {
      'Authorization': `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')}`,
      'Accept': 'application/json'
    };

    const params = new URLSearchParams({
      Query: query,
      PageSize: '50',
      ...(category && { Category: category })
    });

    try {
      const response = await fetch(`${apiUrl}?${params}`, { headers });
      const data = await response.json();
      return this.parseImpactProducts(data);
    } catch (error) {
      console.error('Impact API error:', error);
      return [];
    }
  }

  private parseImpactProducts(data: any): NetworkProduct[] {
    if (!data.Items) return [];
    
    return data.Items.map((item: any) => ({
      networkId: 'impact',
      productId: item.Id,
      name: item.Name,
      description: item.Description,
      price: item.CurrentPrice || 0,
      currency: item.Currency || 'USD',
      imageUrl: item.ImageUrl,
      productUrl: item.TrackingUrl,
      merchantName: item.AdvertiserName,
      merchantId: item.CampaignId,
      category: item.Category,
      commissionRate: item.DefaultPayout || 0,
      commissionType: item.PayoutType || 'percentage',
      cookieDuration: item.CookieLength || 30,
      inStock: item.InStock !== false
    }));
  }

  // Unified Search Across All Networks
  async searchAllNetworks(
    tenantId: string,
    query: string,
    category?: string
  ): Promise<{ [network: string]: NetworkProduct[] }> {
    const networks = await this.getActiveNetworks(tenantId);
    const results: { [network: string]: NetworkProduct[] } = {};

    // Search all networks in parallel
    const searchPromises = networks.map(async (network) => {
      const credentials = this.decryptCredentials(network.credentials);
      
      switch (network.network_id) {
        case 'shareASale':
          results.shareASale = await this.searchShareASale(
            credentials.shareASale,
            query,
            category
          );
          break;
        case 'cjAffiliate':
          results.cjAffiliate = await this.searchCJAffiliate(
            credentials.cjAffiliate,
            query,
            category
          );
          break;
        case 'rakuten':
          results.rakuten = await this.searchRakuten(
            credentials.rakuten,
            query,
            category
          );
          break;
        case 'impact':
          results.impact = await this.searchImpact(
            credentials.impact,
            query,
            category
          );
          break;
      }
    });

    await Promise.all(searchPromises);
    return results;
  }

  // Commission Comparison Engine
  async compareCommissions(
    tenantId: string,
    productName: string
  ): Promise<NetworkCommission[]> {
    const searchResults = await this.searchAllNetworks(tenantId, productName);
    const commissions: NetworkCommission[] = [];

    for (const [network, products] of Object.entries(searchResults)) {
      for (const product of products) {
        const commission: NetworkCommission = {
          networkId: network,
          merchantId: product.merchantId,
          merchantName: product.merchantName,
          baseCommission: product.commissionRate,
          effectiveRate: product.commissionRate,
          cookieDuration: product.cookieDuration
        };

        // Apply any bonus rates or special terms
        const bonusRate = await this.getBonusRate(tenantId, network, product.merchantId);
        if (bonusRate) {
          commission.bonusCommission = bonusRate;
          commission.effectiveRate = product.commissionRate + bonusRate;
        }

        commissions.push(commission);
      }
    }

    // Sort by effective rate (highest first)
    return commissions.sort((a, b) => b.effectiveRate - a.effectiveRate);
  }

  // Cross-Network Product Matching
  async matchProductsAcrossNetworks(
    tenantId: string,
    productName: string
  ): Promise<CrossNetworkMatch> {
    const searchResults = await this.searchAllNetworks(tenantId, productName);
    const commissions = await this.compareCommissions(tenantId, productName);
    
    const matches: CrossNetworkMatch['matches'] = [];
    
    for (const [network, products] of Object.entries(searchResults)) {
      for (const product of products) {
        const commission = commissions.find(
          c => c.networkId === network && c.merchantId === product.merchantId
        );
        
        if (commission) {
          const score = this.calculateMatchScore(productName, product);
          
          matches.push({
            network,
            product,
            commission,
            score
          });
        }
      }
    }

    // Sort by score and commission
    matches.sort((a, b) => {
      const scoreWeight = 0.3;
      const commissionWeight = 0.7;
      
      const aTotal = (a.score * scoreWeight) + (a.commission.effectiveRate * commissionWeight);
      const bTotal = (b.score * scoreWeight) + (b.commission.effectiveRate * commissionWeight);
      
      return bTotal - aTotal;
    });

    const bestMatch = matches[0];
    
    return {
      productName,
      matches,
      bestNetwork: bestMatch?.network || '',
      reasoning: this.generateRecommendationReasoning(matches)
    };
  }

  private calculateMatchScore(query: string, product: NetworkProduct): number {
    const queryLower = query.toLowerCase();
    const nameLower = product.name.toLowerCase();
    
    // Exact match
    if (nameLower === queryLower) return 100;
    
    // Contains match
    if (nameLower.includes(queryLower)) return 80;
    
    // Word overlap
    const queryWords = queryLower.split(' ');
    const nameWords = nameLower.split(' ');
    const overlap = queryWords.filter(w => nameWords.includes(w)).length;
    const overlapScore = (overlap / queryWords.length) * 60;
    
    return Math.min(overlapScore, 60);
  }

  private generateRecommendationReasoning(matches: CrossNetworkMatch['matches']): string {
    if (matches.length === 0) {
      return 'No matching products found across networks.';
    }

    const best = matches[0];
    const reasons = [];

    if (best.commission.effectiveRate > 10) {
      reasons.push(`High commission rate of ${best.commission.effectiveRate}%`);
    }

    if (best.commission.cookieDuration >= 30) {
      reasons.push(`${best.commission.cookieDuration}-day cookie duration`);
    }

    if (best.score >= 80) {
      reasons.push('Excellent product match');
    }

    if (best.product.inStock) {
      reasons.push('Currently in stock');
    }

    if (best.product.rating && best.product.rating >= 4) {
      reasons.push(`Highly rated (${best.product.rating}/5)`);
    }

    return reasons.join(', ') + '.';
  }

  // Network Performance Tracking
  async trackConversion(
    tenantId: string,
    networkId: string,
    productId: string,
    amount: number
  ) {
    const supabase = this.getSupabase();
    
    await supabase.from('network_conversions').insert({
      tenant_id: tenantId,
      network_id: networkId,
      product_id: productId,
      conversion_amount: amount,
      created_at: new Date().toISOString()
    });
  }

  async getNetworkPerformance(tenantId: string, days = 30) {
    const supabase = this.getSupabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('network_conversions')
      .select('network_id, conversion_amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString());

    if (error) throw new Error(`Failed to get network performance: ${error.message}`);

    // Aggregate by network
    const performance: { [network: string]: { total: number; count: number; average: number } } = {};
    
    for (const conversion of data) {
      if (!performance[conversion.network_id]) {
        performance[conversion.network_id] = { total: 0, count: 0, average: 0 };
      }
      
      performance[conversion.network_id].total += conversion.conversion_amount;
      performance[conversion.network_id].count++;
    }

    // Calculate averages
    for (const network in performance) {
      performance[network].average = performance[network].total / performance[network].count;
    }

    return performance;
  }

  // Helper Methods
  private async getBonusRate(
    tenantId: string,
    network: string,
    merchantId: string
  ): Promise<number> {
    // Check for any special bonus rates negotiated with merchants
    const supabase = this.getSupabase();
    
    const { data } = await supabase
      .from('merchant_bonuses')
      .select('bonus_rate')
      .eq('tenant_id', tenantId)
      .eq('network_id', network)
      .eq('merchant_id', merchantId)
      .single();

    return data?.bonus_rate || 0;
  }

  private generateShareASaleSignature(secret: string, params: string): string {
    // Generate HMAC-SHA256 signature for ShareASale API
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(params)
      .digest('hex');
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private encryptCredentials(credentials: any): any {
    // In production, use proper encryption
    // For now, return as-is (implement with crypto library)
    return credentials;
  }

  private decryptCredentials(encryptedCredentials: any): NetworkCredentials {
    // In production, use proper decryption
    // For now, return as-is (implement with crypto library)
    return encryptedCredentials;
  }
}

export const affiliateNetworkService = new AffiliateNetworkService();
