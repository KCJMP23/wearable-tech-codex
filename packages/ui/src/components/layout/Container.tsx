import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const containerStyles = cva(
  'mx-auto w-full',
  {
    variants: {
      size: {
        xs: 'max-w-sm px-4',
        sm: 'max-w-2xl px-4 sm:px-6',
        md: 'max-w-4xl px-4 sm:px-6 lg:px-8',
        lg: 'max-w-6xl px-4 sm:px-6 lg:px-8',
        xl: 'max-w-7xl px-4 sm:px-6 lg:px-8',
        '2xl': 'max-w-screen-2xl px-4 sm:px-6 lg:px-8 xl:px-12',
        full: 'max-w-none px-4 sm:px-6 lg:px-8',
        fluid: 'max-w-none px-0',
      },
      padding: {
        none: 'px-0',
        sm: 'px-4',
        md: 'px-4 sm:px-6',
        lg: 'px-4 sm:px-6 lg:px-8',
        xl: 'px-4 sm:px-6 lg:px-8 xl:px-12',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerStyles> {
  as?: React.ElementType;
}

export function Container({
  className,
  size,
  padding,
  as: Component = 'div',
  children,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={twMerge(containerStyles({ size, padding }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Section container with background variants
const sectionStyles = cva(
  'w-full',
  {
    variants: {
      background: {
        none: '',
        subtle: 'bg-primary-50',
        accent: 'bg-accent-50',
        gradient: 'bg-gradient-subtle',
        warm: 'bg-gradient-warm text-white',
        dark: 'bg-primary-900 text-white',
      },
      spacing: {
        none: 'py-0',
        sm: 'py-8 sm:py-12',
        md: 'py-12 sm:py-16 lg:py-20',
        lg: 'py-16 sm:py-20 lg:py-24',
        xl: 'py-20 sm:py-24 lg:py-32',
      },
    },
    defaultVariants: {
      background: 'none',
      spacing: 'md',
    },
  }
);

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionStyles> {
  as?: React.ElementType;
  containerSize?: ContainerProps['size'];
}

export function Section({
  className,
  background,
  spacing,
  containerSize = 'lg',
  as: Component = 'section',
  children,
  ...props
}: SectionProps) {
  return (
    <Component
      className={twMerge(sectionStyles({ background, spacing }), className)}
      {...props}
    >
      <Container size={containerSize}>
        {children}
      </Container>
    </Component>
  );
}

// Usage examples:
/*
<Container size="md">
  <h1>Standard content container</h1>
</Container>

<Section background="subtle" spacing="lg">
  <h2>Section with subtle background</h2>
  <p>Content automatically wrapped in container</p>
</Section>

<Section background="gradient" spacing="xl" containerSize="xl">
  <h2>Large gradient section</h2>
</Section>
*/