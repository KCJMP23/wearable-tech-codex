import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
} from '@react-email/components';

interface BaseTemplateProps {
  children: React.ReactNode;
  preview?: string;
  companyName?: string;
  companyLogo?: string;
  unsubscribeUrl?: string;
  privacyPolicyUrl?: string;
  companyAddress?: string;
}

export const BaseTemplate: React.FC<BaseTemplateProps> = ({
  children,
  preview,
  companyName = 'AffiliateOS',
  companyLogo,
  unsubscribeUrl,
  privacyPolicyUrl,
  companyAddress,
}) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            {companyLogo ? (
              <Img
                src={companyLogo}
                alt={companyName}
                style={logo}
              />
            ) : (
              <Text style={logoText}>{companyName}</Text>
            )}
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={hr} />
            <Text style={footerText}>
              You received this email because you are subscribed to our mailing list.
            </Text>
            <Text style={footerText}>
              {unsubscribeUrl && (
                <>
                  <Link href={unsubscribeUrl} style={footerLink}>
                    Unsubscribe
                  </Link>
                  {' | '}
                </>
              )}
              {privacyPolicyUrl && (
                <>
                  <Link href={privacyPolicyUrl} style={footerLink}>
                    Privacy Policy
                  </Link>
                  {' | '}
                </>
              )}
              <Link href={`mailto:support@${companyName.toLowerCase()}.com`} style={footerLink}>
                Contact Us
              </Link>
            </Text>
            {companyAddress && (
              <Text style={footerAddress}>
                {companyAddress}
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
};

const logo = {
  height: '40px',
  margin: '0 auto',
};

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0',
};

const content = {
  padding: '24px',
};

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
};

const footerLink = {
  color: '#556cd6',
  textDecoration: 'underline',
};

const footerAddress = {
  color: '#8898aa',
  fontSize: '11px',
  lineHeight: '14px',
  margin: '16px 0 0',
};