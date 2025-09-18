'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button onClick={handleCopy} variant={copied ? 'secondary' : 'ghost'} leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}>
      {copied ? 'Copied!' : label}
    </Button>
  );
}
