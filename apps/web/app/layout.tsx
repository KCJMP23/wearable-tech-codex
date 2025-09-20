import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import Script from 'next/script';
import { ThemeProvider } from '../components/ThemeProvider';
import { ChatbotDock } from './components/ChatbotDock';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QueryProvider } from '../providers/QueryProvider';
import { ConsoleErrorSuppressor } from '../components/ConsoleErrorSuppressor';
import { ClientWrapper } from '../components/ClientWrapper';
import { preloadingConfig } from '../config/performance';

export const metadata: Metadata = {
  title: 'Wearable Tech Codex',
  description: 'Your trusted source for wearable technology reviews and comparisons.',
  other: {
    // DNS prefetch for faster external resource loading
    ...preloadingConfig.dnsPrefetch.reduce((acc, url) => ({
      ...acc,
      [`dns-prefetch-${url}`]: url,
    }), {}),
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fix exports is not defined error */}
        <script src="/exports-polyfill.js" />
        
        {/* Preconnect to critical origins */}
        {preloadingConfig.preconnect.map((link) => (
          <link
            key={link.href}
            rel="preconnect"
            href={link.href}
            crossOrigin={link.crossorigin}
          />
        ))}
        
        {/* DNS Prefetch for external domains */}
        {preloadingConfig.dnsPrefetch.map((href) => (
          <link key={href} rel="dns-prefetch" href={href} />
        ))}
        
        {/* Preload critical resources */}
        {preloadingConfig.preload.map((resource) => (
          <link
            key={resource.href}
            rel="preload"
            href={resource.href}
            as={resource.as}
            type={resource.type}
            crossOrigin={resource.crossorigin}
          />
        ))}
      </head>
      <body className="antialiased">
        <ConsoleErrorSuppressor />
        <ClientWrapper>
          <ErrorBoundary>
            <QueryProvider>
              <ThemeProvider>
                {children}
                <ChatbotDock />
              </ThemeProvider>
            </QueryProvider>
          </ErrorBoundary>
        </ClientWrapper>
      </body>
    </html>
  );
}
