import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

// Heading component
const headingStyles = cva(
  'text-primary-900 font-display tracking-tight',
  {
    variants: {
      level: {
        1: 'text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight',
        2: 'text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight',
        3: 'text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight',
        4: 'text-xl sm:text-2xl lg:text-3xl font-semibold leading-snug',
        5: 'text-lg sm:text-xl lg:text-2xl font-semibold leading-snug',
        6: 'text-base sm:text-lg lg:text-xl font-semibold leading-normal',
      },
      variant: {
        default: 'text-primary-900',
        accent: 'text-accent-600',
        gradient: 'bg-gradient-to-r from-accent-600 to-accent-400 bg-clip-text text-transparent',
        light: 'text-primary-600',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
    },
    defaultVariants: {
      level: 1,
      variant: 'default',
      align: 'left',
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingStyles> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function Heading({
  className,
  level = 1,
  variant,
  align,
  as,
  children,
  ...props
}: HeadingProps) {
  const Component = as || (`h${level}` as const);
  
  return (
    <Component
      className={twMerge(headingStyles({ level, variant, align }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Text component
const textStyles = cva(
  'text-primary-700',
  {
    variants: {
      size: {
        xs: 'text-xs leading-normal',
        sm: 'text-sm leading-relaxed',
        base: 'text-base leading-relaxed',
        lg: 'text-lg leading-relaxed',
        xl: 'text-xl leading-relaxed',
        '2xl': 'text-2xl leading-relaxed',
      },
      weight: {
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
      variant: {
        default: 'text-primary-700',
        light: 'text-primary-500',
        lighter: 'text-primary-400',
        accent: 'text-accent-600',
        success: 'text-green-600',
        warning: 'text-yellow-600',
        error: 'text-red-600',
        info: 'text-blue-600',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
    },
    defaultVariants: {
      size: 'base',
      weight: 'normal',
      variant: 'default',
      align: 'left',
    },
  }
);

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textStyles> {
  as?: 'p' | 'span' | 'div' | 'label';
}

export function Text({
  className,
  size,
  weight,
  variant,
  align,
  as: Component = 'p',
  children,
  ...props
}: TextProps) {
  return (
    <Component
      className={twMerge(textStyles({ size, weight, variant, align }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Caption component
export interface CaptionProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'figcaption';
}

export function Caption({
  className,
  as: Component = 'p',
  children,
  ...props
}: CaptionProps) {
  return (
    <Component
      className={twMerge('text-xs sm:text-sm text-primary-500 leading-normal', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Lead text component for introductory paragraphs
export interface LeadProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Lead({ className, children, ...props }: LeadProps) {
  return (
    <p
      className={twMerge(
        'text-lg sm:text-xl text-primary-600 leading-relaxed font-light',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// Blockquote component
export interface BlockquoteProps extends React.HTMLAttributes<HTMLQuoteElement> {
  author?: string;
  source?: string;
}

export function Blockquote({
  className,
  children,
  author,
  source,
  ...props
}: BlockquoteProps) {
  return (
    <blockquote
      className={twMerge(
        'border-l-4 border-accent-300 pl-6 italic text-lg text-primary-700',
        className
      )}
      {...props}
    >
      <p className="mb-2">{children}</p>
      {(author || source) && (
        <footer className="text-sm text-primary-500 not-italic">
          {author && <cite className="font-medium">{author}</cite>}
          {author && source && <span className="mx-2">•</span>}
          {source && <span>{source}</span>}
        </footer>
      )}
    </blockquote>
  );
}

// Code component
export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

export function Code({ className, inline = true, children, ...props }: CodeProps) {
  if (inline) {
    return (
      <code
        className={twMerge(
          'inline-flex items-center px-2 py-1 rounded-lg bg-primary-100 text-primary-800 text-sm font-mono',
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <pre
      className={twMerge(
        'overflow-x-auto p-4 rounded-2xl bg-primary-900 text-primary-100',
        className
      )}
    >
      <code className="font-mono text-sm" {...props}>
        {children}
      </code>
    </pre>
  );
}

// Mark component for highlighting text
export interface MarkProps extends React.HTMLAttributes<HTMLElement> {}

export function Mark({ className, children, ...props }: MarkProps) {
  return (
    <mark
      className={twMerge(
        'bg-accent-200 text-accent-900 px-1 py-0.5 rounded',
        className
      )}
      {...props}
    >
      {children}
    </mark>
  );
}

// Export all components for easy use
export {
  headingStyles,
  textStyles,
};

// Usage examples:
/*
<Heading level={1} variant="gradient">
  Welcome to Our Platform
</Heading>

<Lead>
  This is an introductory paragraph that provides context for the content below.
</Lead>

<Text size="lg" weight="medium">
  This is a larger, medium-weight paragraph.
</Text>

<Blockquote author="Steve Jobs" source="Stanford Commencement, 2005">
  Stay hungry, stay foolish.
</Blockquote>

<Text>
  Here's some code: <Code>npm install</Code>
</Text>

<Caption>
  This is a small caption or helper text.
</Caption>
*/