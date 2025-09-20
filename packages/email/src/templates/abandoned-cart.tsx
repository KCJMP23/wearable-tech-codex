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

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  quantity: number;
}

interface AbandonedCartEmailProps {
  firstName?: string;
  cartItems: CartItem[];
  cartTotal: number;
  cartUrl: string;
  discountCode?: string;
  discountAmount?: number;
  companyName?: string;
  companyLogo?: string;
  unsubscribeUrl?: string;
  privacyPolicyUrl?: string;
  companyAddress?: string;
}

export const AbandonedCartEmail: React.FC<AbandonedCartEmailProps> = ({
  firstName,
  cartItems,
  cartTotal,
  cartUrl,
  discountCode,
  discountAmount,
  companyName = 'AffiliateOS',
  companyLogo,
  unsubscribeUrl,
  privacyPolicyUrl,
  companyAddress,
}) => {
  const discountedTotal = discountAmount ? cartTotal - discountAmount : cartTotal;

  return (
    <BaseTemplate
      preview="You left something in your cart! Complete your purchase today."
      companyName={companyName}
      companyLogo={companyLogo}
      unsubscribeUrl={unsubscribeUrl}
      privacyPolicyUrl={privacyPolicyUrl}
      companyAddress={companyAddress}
    >
      <Heading style={h1}>
        {firstName ? `${firstName}, you` : 'You'} left something in your cart!
      </Heading>
      
      <Text style={text}>
        Don't miss out on these amazing products you were interested in. 
        Complete your purchase today and get them delivered right to your door.
      </Text>

      {discountCode && (
        <Section style={discountSection}>
          <Heading style={discountTitle}>Special Offer Just for You!</Heading>
          <Text style={discountText}>
            Use code <strong style={discountCode_style}>{discountCode}</strong> 
            {discountAmount && ` to save $${discountAmount.toFixed(2)}`}
          </Text>
        </Section>
      )}

      <Section style={cartSection}>
        <Heading style={h2}>Your Cart Items</Heading>
        
        {cartItems.map((item) => (
          <Section key={item.id} style={cartItem}>
            <Row>
              <Column style={itemImageColumn}>
                <Img
                  src={item.image}
                  alt={item.name}
                  style={itemImage}
                />
              </Column>
              <Column style={itemContentColumn}>
                <Text style={itemName}>{item.name}</Text>
                <Text style={itemDetails}>
                  Quantity: {item.quantity} | Price: ${item.price.toFixed(2)}
                </Text>
                <Text style={itemTotal}>
                  Total: ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </Column>
            </Row>
          </Section>
        ))}

        <Section style={cartSummary}>
          <Row>
            <Column>
              <Text style={summaryLabel}>Subtotal:</Text>
            </Column>
            <Column>
              <Text style={summaryValue}>${cartTotal.toFixed(2)}</Text>
            </Column>
          </Row>
          
          {discountAmount && (
            <Row>
              <Column>
                <Text style={summaryLabel}>Discount:</Text>
              </Column>
              <Column>
                <Text style={discountValue}>-${discountAmount.toFixed(2)}</Text>
              </Column>
            </Row>
          )}
          
          <Row style={totalRow}>
            <Column>
              <Text style={totalLabel}>Total:</Text>
            </Column>
            <Column>
              <Text style={totalValue}>${discountedTotal.toFixed(2)}</Text>
            </Column>
          </Row>
        </Section>
      </Section>

      <Section style={ctaSection}>
        <Button
          href={cartUrl}
          style={{...button, ...primaryButton}}
        >
          Complete Your Purchase
        </Button>
      </Section>

      <Text style={text}>
        Need help? Our customer support team is here to assist you. 
        Simply reply to this email or contact us through our website.
      </Text>

      <Section style={urgencySection}>
        <Text style={urgencyText}>
          ⏰ Hurry! Items in your cart are in high demand and may sell out soon.
        </Text>
      </Section>

      <Text style={text}>
        Happy shopping!<br />
        The {companyName} Team
      </Text>
    </BaseTemplate>
  );
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  lineHeight: '32px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
  lineHeight: '28px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const discountSection = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const discountTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const discountText = {
  color: '#92400e',
  fontSize: '16px',
  margin: '0',
};

const discountCode_style = {
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '18px',
};

const cartSection = {
  margin: '32px 0',
};

const cartItem = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
};

const itemImageColumn = {
  width: '100px',
  verticalAlign: 'top',
};

const itemContentColumn = {
  paddingLeft: '16px',
  verticalAlign: 'top',
};

const itemImage = {
  width: '80px',
  height: '80px',
  borderRadius: '6px',
  objectFit: 'cover' as const,
};

const itemName = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const itemDetails = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px',
};

const itemTotal = {
  color: '#059669',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const cartSummary = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const summaryLabel = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  textAlign: 'left' as const,
};

const summaryValue = {
  color: '#374151',
  fontSize: '16px',
  margin: '0',
  textAlign: 'right' as const,
};

const discountValue = {
  color: '#059669',
  fontSize: '16px',
  margin: '0',
  textAlign: 'right' as const,
};

const totalRow = {
  borderTop: '2px solid #e5e7eb',
  paddingTop: '12px',
  marginTop: '12px',
};

const totalLabel = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'left' as const,
};

const totalValue = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'right' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  display: 'inline-block',
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
};

const primaryButton = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
};

const urgencySection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const urgencyText = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};