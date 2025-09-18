import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '../components/ThemeProvider';
import { ChatbotDock } from './components/ChatbotDock';

export const metadata: Metadata = {
  title: 'Affiliate Factory Orchestrator',
  description: 'Multi-tenant wearable tech affiliate sites orchestrated by agents.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <ChatbotDock />
        </ThemeProvider>
      </body>
    </html>
  );
}
