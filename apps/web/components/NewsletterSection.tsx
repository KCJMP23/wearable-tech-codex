'use client';

import { NewsletterBar } from '@affiliate-factory/ui';

interface NewsletterSectionProps {
  tenantSlug: string;
}

export function NewsletterSection({ tenantSlug }: NewsletterSectionProps) {
  const handleSubscribe = async (email: string) => {
    try {
      // We'll implement this as a simple fetch to avoid server action issues
      const response = await fetch(`/api/newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, tenantSlug }),
      });
      
      if (response.ok) {
        // Show success message
        console.log('Subscribed successfully');
      }
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  return (
    <section className="py-16 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Get the latest product reviews, buying guides, and exclusive deals delivered to your inbox.
          </p>
          <div className="max-w-md mx-auto">
            <NewsletterBar onSubscribe={handleSubscribe} />
          </div>
        </div>
      </div>
    </section>
  );
}