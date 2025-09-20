import React from 'react';
import {
  Text,
  Link,
  Section,
  Button,
  Heading,
  Img,
  Row,
  Column,
} from '@react-email/components';
import { BaseTemplate } from './base';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  url: string;
  rating?: number;
}

interface NewsletterEmailProps {
  title: string;
  subtitle?: string;
  featuredArticle?: {
    title: string;
    excerpt: string;
    image?: string;
    url: string;
  };
  products?: Product[];
  companyName?: string;
  companyLogo?: string;
  unsubscribeUrl?: string;
  privacyPolicyUrl?: string;
  companyAddress?: string;
}

export const NewsletterEmail: React.FC<NewsletterEmailProps> = ({
  title,
  subtitle,
  featuredArticle,
  products = [],
  companyName = 'AffiliateOS',
  companyLogo,
  unsubscribeUrl,
  privacyPolicyUrl,
  companyAddress,
}) => {
  return (
    <BaseTemplate
      preview={subtitle || title}
      companyName={companyName}
      companyLogo={companyLogo}
      unsubscribeUrl={unsubscribeUrl}
      privacyPolicyUrl={privacyPolicyUrl}
      companyAddress={companyAddress}
    >
      <Heading style={h1}>{title}</Heading>
      
      {subtitle && (
        <Text style={subtitle_style}>{subtitle}</Text>
      )}

      {featuredArticle && (
        <Section style={featuredSection}>
          <Heading style={h2}>Featured Article</Heading>
          {featuredArticle.image && (
            <Img
              src={featuredArticle.image}
              alt={featuredArticle.title}
              style={featuredImage}
            />
          )}
          <Heading style={h3}>{featuredArticle.title}</Heading>
          <Text style={text}>{featuredArticle.excerpt}</Text>
          <Button
            href={featuredArticle.url}
            style={{...button, ...primaryButton}}
          >
            Read More
          </Button>
        </Section>
      )}

      {products.length > 0 && (
        <Section style={productsSection}>
          <Heading style={h2}>Featured Products</Heading>
          <Text style={text}>
            Check out these hand-picked products we think you'll love:
          </Text>
          
          {products.map((product, index) => (
            <Section key={product.id} style={productCard}>
              <Row>
                <Column style={productImageColumn}>
                  <Img
                    src={product.image}
                    alt={product.name}
                    style={productImage}
                  />
                </Column>
                <Column style={productContentColumn}>
                  <Heading style={productTitle}>{product.name}</Heading>
                  <Text style={productDescription}>
                    {product.description}
                  </Text>
                  <Text style={productPrice}>
                    ${product.price.toFixed(2)}
                    {product.rating && (
                      <span style={productRating}>
                        {' ★'.repeat(Math.floor(product.rating))} ({product.rating})
                      </span>
                    )}
                  </Text>
                  <Button
                    href={product.url}
                    style={{...button, ...secondaryButton}}
                  >
                    View Product
                  </Button>
                </Column>
              </Row>
            </Section>
          ))}
        </Section>
      )}

      <Section style={ctaSection}>
        <Text style={text}>
          Want to discover more products and deals? Visit our website to explore 
          our full catalog of curated recommendations.
        </Text>
        <Button
          href={`https://${companyName.toLowerCase()}.com`}
          style={{...button, ...primaryButton}}
        >
          Shop Now
        </Button>
      </Section>

      <Text style={text}>
        Thank you for being part of our community!<br />
        The {companyName} Team
      </Text>
    </BaseTemplate>
  );
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  lineHeight: '36px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '32px 0 16px',
  lineHeight: '32px',
};

const h3 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '16px 0 8px',
  lineHeight: '28px',
};

const subtitle_style = {
  color: '#6b7280',
  fontSize: '18px',
  lineHeight: '28px',
  margin: '0 0 32px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const featuredSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const featuredImage = {
  width: '100%',
  height: 'auto',
  borderRadius: '6px',
  margin: '16px 0',
};

const productsSection = {
  margin: '32px 0',
};

const productCard = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
};

const productImageColumn = {
  width: '140px',
  verticalAlign: 'top',
};

const productContentColumn = {
  paddingLeft: '20px',
  verticalAlign: 'top',
};

const productImage = {
  width: '120px',
  height: '120px',
  borderRadius: '6px',
  objectFit: 'cover' as const,
};

const productTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  lineHeight: '24px',
};

const productDescription = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px',
};

const productPrice = {
  color: '#059669',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const productRating = {
  color: '#f59e0b',
  fontSize: '14px',
  fontWeight: 'normal',
};

const ctaSection = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  display: 'inline-block',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  margin: '8px 4px',
};

const primaryButton = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
};