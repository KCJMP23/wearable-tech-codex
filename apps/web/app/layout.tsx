import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '../components/ThemeProvider';
import { ChatbotDock } from './components/ChatbotDock';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Wearable Tech Codex',
  description: 'Your trusted source for wearable technology reviews and comparisons.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            <ChatbotDock />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
