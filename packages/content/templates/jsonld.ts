import type { JsonLdPayload, Post, Product } from '@affiliate-factory/sdk';

export function buildArticleJsonLd(post: Post, tenantDomain: string): JsonLdPayload {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt ?? new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: tenantDomain
    },
    publisher: {
      '@type': 'Organization',
      name: tenantDomain,
      logo: post.images?.[0]?.url
        ? {
            '@type': 'ImageObject',
            url: post.images[0].url
          }
        : undefined
    },
    image: post.images.map((image) => image.url),
    mainEntityOfPage: `https://${tenantDomain}/blog/${post.slug}`
  } satisfies JsonLdPayload;
}

export function buildProductJsonLd(product: Product): JsonLdPayload {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    brand: product.brand,
    image: product.images.map((image) => image.url),
    review: product.reviewCount
      ? {
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: product.rating,
            bestRating: 5
          },
          author: {
            '@type': 'Organization',
            name: 'Amazon'
          }
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency ?? 'USD',
      url: product.affiliateUrl,
      availability: 'https://schema.org/InStock'
    }
  } satisfies JsonLdPayload;
}
