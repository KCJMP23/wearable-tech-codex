'use client';

import * as React from 'react';
import { useState } from 'react';
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { Button, ButtonProps } from '../base/Button';
import { twMerge } from 'tailwind-merge';

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'leftIcon' | 'rightIcon' | 'children'> {
  value: string;
  label?: string;
  copiedLabel?: string;
  timeout?: number;
  showIcon?: boolean;
  onCopied?: (value: string) => void;
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied!',
  timeout = 2000,
  showIcon = true,
  onCopied,
  variant = 'ghost',
  size = 'sm',
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.(value);
      
      setTimeout(() => {
        setCopied(false);
      }, timeout);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const icon = copied ? <CheckIcon /> : <DocumentDuplicateIcon />;

  return (
    <Button
      variant={copied ? 'success' : variant}
      size={size}
      leftIcon={showIcon ? icon : undefined}
      onClick={handleCopy}
      className={twMerge(
        copied && 'transition-all duration-200',
        className
      )}
      {...props}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

// Inline copy button for use within text
export interface InlineCopyButtonProps {
  value: string;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md';
}

export function InlineCopyButton({ 
  value, 
  className,
  iconOnly = true,
  size = 'sm'
}: InlineCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <button
      type="button"
      className={twMerge(
        'inline-flex items-center gap-1 p-1 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
        copied && 'text-green-600',
        className
      )}
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <CheckIcon className={iconSize} />
      ) : (
        <DocumentDuplicateIcon className={iconSize} />
      )}
      {!iconOnly && (
        <span className="text-xs font-medium">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      )}
    </button>
  );
}

// Code block with copy functionality
export interface CopyCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CopyCodeBlock({
  code,
  language,
  filename,
  className,
  showLineNumbers = false,
}: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className={twMerge(
      'relative group rounded-2xl bg-primary-900 text-primary-100 overflow-hidden',
      className
    )}>
      {/* Header */}
      {(filename || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary-800 border-b border-primary-700">
          <div className="flex items-center gap-2">
            {filename && (
              <span className="text-sm font-medium text-primary-200">
                {filename}
              </span>
            )}
            {language && (
              <span className="text-xs px-2 py-1 rounded-lg bg-primary-700 text-primary-300">
                {language}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Copy button */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          className={twMerge(
            'p-2 rounded-xl bg-primary-800 hover:bg-primary-700 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
            copied && 'bg-green-600 hover:bg-green-700'
          )}
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-white" />
          ) : (
            <DocumentDuplicateIcon className="h-4 w-4 text-primary-300" />
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono">
          <code>
            {showLineNumbers ? (
              <div className="flex">
                <div className="flex flex-col text-primary-500 mr-4 select-none">
                  {lines.map((_, index) => (
                    <span key={index} className="leading-6">
                      {(index + 1).toString().padStart(2, ' ')}
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  {lines.map((line, index) => (
                    <div key={index} className="leading-6">
                      {line || ' '}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Usage examples:
/*
<CopyButton
  value="npm install @affiliate-factory/ui"
  label="Copy Command"
  variant="outline"
  size="sm"
  onCopied={(value) => console.log('Copied:', value)}
/>

<p>
  Install the package: 
  <code className="mx-1 px-2 py-1 bg-primary-100 rounded">
    npm install @affiliate-factory/ui
  </code>
  <InlineCopyButton value="npm install @affiliate-factory/ui" />
</p>

<CopyCodeBlock
  code={`import { Button } from '@affiliate-factory/ui';

function App() {
  return <Button>Click me</Button>;
}`}
  language="tsx"
  filename="App.tsx"
  showLineNumbers={true}
/>
*/
