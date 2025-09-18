'use client';

import { useState } from 'react';
import { Button } from './Button';

interface NewsletterBarProps {
  onSubscribe: (email: string) => Promise<void>;
}

export function NewsletterBar({ onSubscribe }: NewsletterBarProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    try {
      setStatus('loading');
      await onSubscribe(email);
      setStatus('sent');
      setEmail('');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 rounded-3xl bg-neutral-900 p-6 text-white md:flex-row md:items-center">
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">Stay in the loop</p>
        <h4 className="text-xl font-semibold">Weekly wearable tech intel and curated picks.</h4>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="h-11 w-full rounded-full border border-neutral-700 bg-white px-4 text-neutral-900 focus-visible:outline focus-visible:outline-amber-400 md:w-72"
        />
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending…' : status === 'sent' ? 'Sent!' : 'Subscribe'}
        </Button>
      </div>
      {status === 'error' ? <p className="text-xs text-amber-200">Try again — connection hiccup.</p> : null}
    </form>
  );
}
