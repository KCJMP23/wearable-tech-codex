import crypto from 'crypto';
import type { AmazonProductResponse, ProductImage } from '@affiliate-factory/sdk';

export interface AmazonConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  region?: string;
}

export interface ProductSearchParams {
  keywords?: string;
  searchIndex?: string;
  browseNode?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  itemCount?: number;
}

export interface ProductDetailsParams {
  asins: string[];
  resources?: string[];
}

export class AmazonPAAPIClient {
  private accessKey: string;
  private secretKey: string;
  private partnerTag: string;
  private region: string;
  private endpoint: string;

  constructor(config: AmazonConfig) {
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.partnerTag = config.partnerTag;
    this.region = config.region || 'us-east-1';
    this.endpoint = `https://webservices.amazon.com/paapi5/${this.region === 'us-east-1' ? 'searchitems' : 'searchitems'}`;
  }

  private createSignature(method: string, uri: string, queryString: string, payload: string): string {
    const canonicalRequest = [
      method,
      uri,
      queryString,
      'content-type:application/json; charset=utf-8',
      'host:webservices.amazon.com',
      'x-amz-date:' + this.getAmzDate(),
      '',
      'content-type;host;x-amz-date',
      crypto.createHash('sha256').update(payload).digest('hex')
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      this.getAmzDate(),
      this.getAmzDate().substr(0, 8) + '/' + this.region + '/ProductAdvertisingAPI/aws4_request',
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signingKey = this.getSignatureKey(this.secretKey, this.getAmzDate().substr(0, 8), this.region, 'ProductAdvertisingAPI');
    return crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  }

  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  private getAmzDate(): string {
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  }

  async searchProducts(params: ProductSearchParams): Promise<AmazonProductResponse[]> {
    const payload = {
      Keywords: params.keywords,
      SearchIndex: params.searchIndex || 'All',
      ItemCount: params.itemCount || 10,
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Resources: [
        'Images.Primary.Medium',
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ByLineInfo',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count',
        'Offers.Listings.Price'
      ]
    };

    if (params.browseNode) {
      payload['BrowseNodeId'] = params.browseNode;
    }

    const response = await this.makeRequest('SearchItems', payload);
    return this.parseSearchResponse(response);
  }

  async getProductDetails(params: ProductDetailsParams): Promise<AmazonProductResponse[]> {
    const payload = {
      ItemIds: params.asins,
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Resources: params.resources || [
        'Images.Primary.Medium',
        'Images.Primary.Large',
        'Images.Variants.Medium',
        'Images.Variants.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ByLineInfo',
        'ItemInfo.ManufactureInfo',
        'ItemInfo.ProductInfo',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count',
        'Offers.Listings.Price',
        'Offers.Listings.Availability'
      ]
    };

    const response = await this.makeRequest('GetItems', payload);
    return this.parseItemResponse(response);
  }

  private async makeRequest(operation: string, payload: any): Promise<any> {
    const endpoint = `https://webservices.amazon.com/paapi5/${operation.toLowerCase()}`;
    const payloadStr = JSON.stringify(payload);
    
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': 'webservices.amazon.com',
      'X-Amz-Date': this.getAmzDate(),
      'Authorization': this.getAuthorizationHeader(operation, payloadStr)
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payloadStr
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amazon PA-API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private getAuthorizationHeader(operation: string, payload: string): string {
    const uri = `/paapi5/${operation.toLowerCase()}`;
    const signature = this.createSignature('POST', uri, '', payload);
    
    return [
      'AWS4-HMAC-SHA256',
      `Credential=${this.accessKey}/${this.getAmzDate().substr(0, 8)}/${this.region}/ProductAdvertisingAPI/aws4_request`,
      'SignedHeaders=content-type;host;x-amz-date',
      `Signature=${signature}`
    ].join(' ');
  }

  private parseSearchResponse(response: any): AmazonProductResponse[] {
    if (!response.SearchResult?.Items) {
      return [];
    }

    return response.SearchResult.Items.map((item: any) => this.parseItem(item));
  }

  private parseItemResponse(response: any): AmazonProductResponse[] {
    if (!response.ItemsResult?.Items) {
      return [];
    }

    return response.ItemsResult.Items.map((item: any) => this.parseItem(item));
  }

  private parseItem(item: any): AmazonProductResponse {
    const images: ProductImage[] = [];
    
    // Primary image
    if (item.Images?.Primary?.Medium?.URL) {
      images.push({
        url: item.Images.Primary.Medium.URL,
        alt: item.ItemInfo?.Title?.DisplayValue || 'Product image',
        width: item.Images.Primary.Medium.Width,
        height: item.Images.Primary.Medium.Height
      });
    }

    // Variant images
    if (item.Images?.Variants) {
      item.Images.Variants.forEach((variant: any) => {
        if (variant.Medium?.URL) {
          images.push({
            url: variant.Medium.URL,
            alt: item.ItemInfo?.Title?.DisplayValue || 'Product image',
            width: variant.Medium.Width,
            height: variant.Medium.Height
          });
        }
      });
    }

    // Extract price
    let price;
    if (item.Offers?.Listings?.[0]?.Price?.Amount) {
      price = {
        amount: item.Offers.Listings[0].Price.Amount,
        currency: item.Offers.Listings[0].Price.Currency
      };
    }

    return {
      asin: item.ASIN,
      detailPageURL: item.DetailPageURL,
      title: item.ItemInfo?.Title?.DisplayValue,
      brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
      features: item.ItemInfo?.Features?.DisplayValues || [],
      images,
      rating: item.CustomerReviews?.StarRating?.Value,
      reviewCount: item.CustomerReviews?.Count,
      price
    };
  }

  generateAffiliateUrl(asin: string, tag?: string): string {
    const partnerTag = tag || this.partnerTag;
    return `https://amazon.com/dp/${asin}?tag=${partnerTag}`;
  }

  extractAsinFromUrl(url: string): string | null {
    const asinMatch = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
    return asinMatch ? asinMatch[1] : null;
  }
}

export function createAmazonClient(config: AmazonConfig): AmazonPAAPIClient {
  return new AmazonPAAPIClient(config);
}