'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ABTestingView } from './ABTestingView';

// Mock experiments data - in production, fetch from database
const EXPERIMENTS = [
  {
    id: 'exp-001',
    name: 'Hero CTA Button Color',
    description: 'Testing amber vs green CTA buttons for conversion',
    status: 'running',
    type: 'visual',
    metric: 'conversion_rate',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: null,
    traffic: 50,
    variants: [
      {
        id: 'control',
        name: 'Control (Amber)',
        description: 'Original amber button',
        traffic: 50,
        visitors: 12453,
        conversions: 523,
        conversionRate: 4.2,
        revenue: 34562.89,
        confidence: 0,
        isControl: true,
        config: { buttonColor: '#f59e0b' }
      },
      {
        id: 'variant-a',
        name: 'Variant A (Green)',
        description: 'Green button for urgency',
        traffic: 50,
        visitors: 12398,
        conversions: 612,
        conversionRate: 4.94,
        revenue: 40234.12,
        confidence: 95.3,
        winner: true,
        improvement: 17.6,
        config: { buttonColor: '#10b981' }
      }
    ],
    significance: 95.3,
    minimumSampleSize: 25000,
    currentSampleSize: 24851,
    estimatedDaysRemaining: 1
  },
  {
    id: 'exp-002',
    name: 'Product Grid Layout',
    description: '3-column vs 4-column product grid',
    status: 'running',
    type: 'layout',
    metric: 'click_through_rate',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endDate: null,
    traffic: 50,
    variants: [
      {
        id: 'control',
        name: 'Control (3 columns)',
        description: 'Standard 3-column grid',
        traffic: 50,
        visitors: 6234,
        conversions: 892,
        conversionRate: 14.3,
        revenue: 18923.45,
        confidence: 0,
        isControl: true,
        config: { columns: 3 }
      },
      {
        id: 'variant-a',
        name: 'Variant A (4 columns)',
        description: 'Denser 4-column grid',
        traffic: 50,
        visitors: 6189,
        conversions: 823,
        conversionRate: 13.3,
        revenue: 17234.89,
        confidence: 78.2,
        improvement: -7.0,
        config: { columns: 4 }
      }
    ],
    significance: 78.2,
    minimumSampleSize: 15000,
    currentSampleSize: 12423,
    estimatedDaysRemaining: 2
  },
  {
    id: 'exp-003',
    name: 'Pricing Display Strategy',
    description: 'Testing "Starting at" vs exact pricing',
    status: 'completed',
    type: 'content',
    metric: 'add_to_cart_rate',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    traffic: 50,
    variants: [
      {
        id: 'control',
        name: 'Control (Exact Price)',
        description: 'Shows exact product price',
        traffic: 50,
        visitors: 34567,
        conversions: 2074,
        conversionRate: 6.0,
        revenue: 123456.78,
        confidence: 0,
        isControl: true,
        config: { priceFormat: 'exact' }
      },
      {
        id: 'variant-a',
        name: 'Variant A (Starting At)',
        description: 'Shows "Starting at $X"',
        traffic: 50,
        visitors: 34892,
        conversions: 2513,
        conversionRate: 7.2,
        revenue: 149234.56,
        confidence: 99.8,
        winner: true,
        improvement: 20.0,
        config: { priceFormat: 'starting_at' }
      }
    ],
    significance: 99.8,
    minimumSampleSize: 68000,
    currentSampleSize: 69459,
    estimatedDaysRemaining: 0
  },
  {
    id: 'exp-004',
    name: 'Review Stars Position',
    description: 'Above vs below product title',
    status: 'draft',
    type: 'visual',
    metric: 'engagement_rate',
    startDate: null,
    endDate: null,
    traffic: 50,
    variants: [
      {
        id: 'control',
        name: 'Control (Below Title)',
        description: 'Stars below product title',
        traffic: 50,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        confidence: 0,
        isControl: true,
        config: { starsPosition: 'below' }
      },
      {
        id: 'variant-a',
        name: 'Variant A (Above Title)',
        description: 'Stars above product title',
        traffic: 50,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        confidence: 0,
        config: { starsPosition: 'above' }
      }
    ],
    significance: 0,
    minimumSampleSize: 10000,
    currentSampleSize: 0,
    estimatedDaysRemaining: null
  },
  {
    id: 'exp-005',
    name: 'Free Shipping Threshold Message',
    description: 'Testing different free shipping messages',
    status: 'paused',
    type: 'content',
    metric: 'average_order_value',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    endDate: null,
    traffic: 33,
    variants: [
      {
        id: 'control',
        name: 'Control (No Message)',
        description: 'No free shipping message',
        traffic: 34,
        visitors: 4532,
        conversions: 234,
        conversionRate: 5.16,
        revenue: 15234.89,
        avgOrderValue: 65.13,
        confidence: 0,
        isControl: true,
        config: { message: null }
      },
      {
        id: 'variant-a',
        name: 'Variant A ($75)',
        description: 'Free shipping over $75',
        traffic: 33,
        visitors: 4489,
        conversions: 256,
        conversionRate: 5.71,
        revenue: 19234.56,
        avgOrderValue: 75.13,
        confidence: 89.2,
        improvement: 15.4,
        config: { message: 'Free shipping on orders over $75' }
      },
      {
        id: 'variant-b',
        name: 'Variant B ($50)',
        description: 'Free shipping over $50',
        traffic: 33,
        visitors: 4501,
        conversions: 289,
        conversionRate: 6.42,
        revenue: 18923.45,
        avgOrderValue: 65.48,
        confidence: 94.7,
        improvement: 0.5,
        config: { message: 'Free shipping on orders over $50' }
      }
    ],
    significance: 94.7,
    minimumSampleSize: 15000,
    currentSampleSize: 13522,
    estimatedDaysRemaining: 3
  }
];

export default function ExperimentsPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [tenantId, setTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch tenant details from API
    // For now, use a mock tenant ID
    setTimeout(() => {
      setTenantId('mock-tenant-id');
      setLoading(false);
    }, 100);
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-neutral-400">Loading experiments...</div>
      </div>
    );
  }

  return <ABTestingView 
    tenantSlug={tenantSlug}
    tenantId={tenantId}
    experiments={EXPERIMENTS}
  />;
}