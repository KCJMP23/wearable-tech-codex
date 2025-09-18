import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonStyles = cva(
  'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-amber-500 text-neutral-900 hover:bg-amber-400 focus-visible:outline-amber-500',
        secondary: 'bg-neutral-900 text-amber-200 hover:bg-neutral-800 focus-visible:outline-neutral-900',
        ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:outline-neutral-300'
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-base'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({ className, variant, size, leftIcon, rightIcon, children, ...props }: ButtonProps) {
  return (
    <button className={twMerge(buttonStyles({ variant, size }), className)} {...props}>
      {leftIcon ? <span className="mr-2">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="ml-2">{rightIcon}</span> : null}
    </button>
  );
}
