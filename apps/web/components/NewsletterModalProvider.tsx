'use client';

import { NewsletterModal, useNewsletterModal } from './NewsletterModal';

interface NewsletterModalProviderProps {
  tenantSlug: string;
}

export function NewsletterModalProvider({ tenantSlug }: NewsletterModalProviderProps) {
  const { isOpen, closeModal } = useNewsletterModal();

  return (
    <NewsletterModal
      isOpen={isOpen}
      onClose={closeModal}
      tenantSlug={tenantSlug}
    />
  );
}