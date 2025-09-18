'use client';

import type { Tenant } from '@affiliate-factory/sdk';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useThemeTokens } from '../../components/ThemeProvider';

interface ThemeBridgeProps {
  tenant: Tenant | null;
  children: ReactNode;
}

export function ThemeBridge({ tenant, children }: ThemeBridgeProps) {
  const { setTokens } = useThemeTokens();

  useEffect(() => {
    if (tenant?.colorTokens) {
      const { accent = '#F29F80', background = '#F8F6F2', text = '#1F1B16', muted = '#AEA59D' } = tenant.colorTokens as Record<string, string>;
      setTokens({ accent, background, text, muted });
    }
  }, [tenant, setTokens]);

  return <>{children}</>;
}
