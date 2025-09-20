import React from 'react';
import {
  Text,
  Link,
  Section,
  Button,
  Heading,
} from '@react-email/components';
import { BaseTemplate } from './base';

interface WelcomeEmailProps {
  firstName?: string;
  companyName?: string;
  companyLogo?: string;
  verificationUrl?: string;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
  privacyPolicyUrl?: string;
  companyAddress?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  firstName = 'there',
  companyName = 'AffiliateOS',
  companyLogo,
  verificationUrl,
  dashboardUrl,
  unsubscribeUrl,
  privacyPolicyUrl,
  companyAddress,
}) => {
  return (
    <BaseTemplate
      preview={`Welcome to ${companyName}! Get started with your affiliate marketing journey.`}
      companyName={companyName}
      companyLogo={companyLogo}
      unsubscribeUrl={unsubscribeUrl}
      privacyPolicyUrl={privacyPolicyUrl}
      companyAddress={companyAddress}
    >
      <Heading style={h1}>Welcome to {companyName}, {firstName}!</Heading>
      
      <Text style={text}>
        We're thrilled to have you join our community of successful affiliate marketers. 
        Your journey to building a profitable affiliate business starts now.
      </Text>

      {verificationUrl && (
        <Section style={buttonSection}>
          <Button
            href={verificationUrl}
            style={{...button, ...primaryButton}}
          >
            Verify Your Email
          </Button>
        </Section>
      )}

      <Text style={text}>
        Here's what you can do next:
      </Text>

      <Section style={listSection}>
        <Text style={listItem}>• Set up your first affiliate store</Text>
        <Text style={listItem}>• Browse our product catalog</Text>
        <Text style={listItem}>• Create your first blog post</Text>
        <Text style={listItem}>• Customize your site design</Text>
      </Section>

      {dashboardUrl && (
        <Section style={buttonSection}>
          <Button
            href={dashboardUrl}
            style={{...button, ...secondaryButton}}
          >
            Go to Dashboard
          </Button>
        </Section>
      )}

      <Text style={text}>
        Need help getting started? Check out our{' '}
        <Link href={`${dashboardUrl}/docs`} style={link}>
          documentation
        </Link>{' '}
        or reach out to our support team.
      </Text>

      <Text style={text}>
        Best regards,<br />
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
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
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
};

const primaryButton = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
};

const secondaryButton = {
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
};

const listSection = {
  margin: '20px 0',
  paddingLeft: '20px',
};

const listItem = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};