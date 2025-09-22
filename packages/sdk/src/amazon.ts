import crypto from 'crypto';
import axios from 'axios';
import { loadEnv } from './env.js';
import type { AmazonProductResponse, Product } from './types.js';

interface AmazonSearchParams {
  asinList: string[];
  locale?: string;
}

function createSignedHeaders(path: string, payload: string): Record<string, string> {
  const env = loadEnv();
  const host = `webservices.amazon.${env.AMAZON_PA_API_LOCALE.toLowerCase()}`;
  const now = new Date().toISOString();
  const canonicalRequest = ['POST', path, '', `content-encoding:amz-1.0`, `host:${host}`, `x-amz-date:${now}`, '', 'content-encoding;host;x-amz-date', crypto.createHash('sha256').update(payload, 'utf8').digest('hex')].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', now, `${now.slice(0, 8)}/${env.AMAZON_PA_API_LOCALE}/ProductAdvertisingAPI/aws4_request`, crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')].join('\n');
  const kDate = crypto.createHmac('sha256', `AWS4${env.AMAZON_PA_API_SECRET_KEY}`).update(now.slice(0, 8)).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(env.AMAZON_PA_API_LOCALE).digest();
  const kService = crypto.createHmac('sha256', kRegion).update('ProductAdvertisingAPI').digest();
  const signingKey = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    'content-encoding': 'amz-1.0',
    'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
    'x-amz-date': now,
    Authorization: `AWS4-HMAC-SHA256 Credential=${env.AMAZON_PA_API_ACCESS_KEY}/${now.slice(0, 8)}/${env.AMAZON_PA_API_LOCALE}/ProductAdvertisingAPI/aws4_request, SignedHeaders=content-encoding;host;x-amz-date, Signature=${signature}`
  };
}

export async function fetchAmazonProducts(params: AmazonSearchParams): Promise<AmazonProductResponse[]> {
  const env = loadEnv();
  const path = '/paapi5/getitems';
  const payload = JSON.stringify({
    PartnerTag: env.AMAZON_PA_API_PARTNER_TAG,
    PartnerType: env.AMAZON_PA_API_PARTNER_TYPE,
    Marketplace: `www.amazon.${env.AMAZON_PA_API_LOCALE.toLowerCase()}`,
    ItemIds: params.asinList,
    ItemIdType: 'ASIN',
    Resources: [
      'Images.Primary.Medium',
      'Images.Variants.Medium',
      'ItemInfo.Title',
      'ItemInfo.Features',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Classifications',
      'Offers.Listings.Price'
    ]
  });

  const headers = createSignedHeaders(path, payload);

  const response = await axios.post(`https://webservices.amazon.${env.AMAZON_PA_API_LOCALE.toLowerCase()}${path}`, payload, {
    headers
  });

  const items = response.data?.ItemsResult?.Items ?? [];
  return items.map((item: any) => {
    const detailUrl = ensureAffiliateTag(item.DetailPageURL as string, env.AMAZON_PA_API_PARTNER_TAG);
    return {
      asin: item.ASIN,
      detailPageURL: detailUrl,
      title: item?.ItemInfo?.Title?.DisplayValue,
      brand: item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
      features: item?.ItemInfo?.Features?.DisplayValues ?? [],
      rating: item?.ItemInfo?.ProductInfo?.Rating?.DisplayValue,
      reviewCount: item?.ItemInfo?.ProductInfo?.ReviewCount?.DisplayValue,
      images: (item?.Images?.Primary ? [item.Images.Primary] : []).map((img: any) => ({
        url: img?.Medium?.URL,
        alt: item?.ItemInfo?.Title?.DisplayValue ?? 'Product image'
      })),
      price: item?.Offers?.Listings?.[0]?.Price
        ? {
            amount: item.Offers.Listings[0].Price.Amount,
            currency: item.Offers.Listings[0].Price.Currency
          }
        : undefined
    };
  });
}

export function ensureAffiliateTag(url: string, tag = loadEnv().AMAZON_PA_API_PARTNER_TAG): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('tag')) {
      parsed.searchParams.set('tag', tag);
    }
    return parsed.toString();
  } catch (error) {
    return url.includes('tag=') ? url : `${url}?tag=${tag}`;
  }
}

export function mapAmazonProductToEntity(item: AmazonProductResponse, tenantId: string): Product {
  return {
    id: crypto.randomUUID(),
    tenantId,
    asin: item.asin,
    title: item.title ?? 'Untitled product',
    brand: item.brand ?? null,
    images: item.images ?? [],
    features: (item.features ?? []).map((feature) => ({ title: '', description: feature })),
    rating: item.rating ?? null,
    reviewCount: item.reviewCount ?? null,
    priceSnapshot: item.price ? `${item.price.amount} ${item.price.currency}` : null,
    currency: item.price?.currency ?? null,
    category: null,
    subcategory: null,
    deviceType: null,
    compatibility: {},
    regulatoryNotes: null,
    healthMetrics: [],
    batteryLifeHours: null,
    waterResistance: null,
    affiliateUrl: ensureAffiliateTag(item.detailPageURL),
    source: 'amazon',
    lastVerifiedAt: new Date().toISOString(),
    raw: item as unknown as Record<string, unknown>
  };
}
