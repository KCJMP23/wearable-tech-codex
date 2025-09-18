'use client';

import { useEffect, useState } from 'react';
import { Button } from './Button';

interface StickyCTAProps {
  label: string;
  description?: string;
  onClick?: () => void;
}

export function StickyCTA({ label, description, onClick }: StickyCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrolled = window.scrollY;
      setVisible(scrolled > 320);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleClick() {
    if (onClick) {
      onClick();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 flex justify-center transition ${
        visible ? 'opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-full bg-neutral-900 px-6 py-3 text-white shadow-2xl">
        <div>
          <p className="text-sm font-semibold">{description ?? 'Keep exploring the top picks curated for you.'}</p>
        </div>
        <Button onClick={handleClick} variant="primary">
          {label}
        </Button>
      </div>
    </div>
  );
}
