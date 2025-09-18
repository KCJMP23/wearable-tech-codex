'use client';

import { NewsletterBar } from '@affiliate-factory/ui';

interface NewsletterWrapperProps {
  onSubscribe: (email: string) => Promise<void>;
}

export function NewsletterWrapper({ onSubscribe }: NewsletterWrapperProps) {
  return <NewsletterBar onSubscribe={onSubscribe} />;
}