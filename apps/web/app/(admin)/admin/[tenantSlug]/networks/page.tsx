'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AffiliateNetworksView } from './AffiliateNetworksView';


// Mock data for affiliate networks - in production, fetch from database
const AFFILIATE_NETWORKS = [
  {
    id: 'amazon',
    name: 'Amazon Associates',
    logo: '🛒',
    status: 'connected',
    commission: '1-10%',
    cookieDuration: '24 hours',
    paymentTerms: 'Net 60',
    earnings: {
      today: 127.43,
      week: 892.17,
      month: 3421.89,
      total: 41283.92
    },
    products: 15234,
    lastSync: new Date(Date.now() - 3600000),
    apiKey: 'amz_***_7d3f',
    metrics: {
      conversionRate: 4.2,
      avgOrderValue: 67.89,
      clickThrough: 12.3
    }
  },
  {
    id: 'shareasale',
    name: 'ShareASale',
    logo: '🔗',
    status: 'pending',
    commission: '5-30%',
    cookieDuration: '30 days',
    paymentTerms: 'Net 20',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  },
  {
    id: 'cj',
    name: 'CJ Affiliate',
    logo: '💼',
    status: 'disconnected',
    commission: '3-20%',
    cookieDuration: '7-120 days',
    paymentTerms: 'Net 20',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  },
  {
    id: 'rakuten',
    name: 'Rakuten Advertising',
    logo: '🎌',
    status: 'disconnected',
    commission: '2-15%',
    cookieDuration: '7-30 days',
    paymentTerms: 'Net 30',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  },
  {
    id: 'impact',
    name: 'Impact Radius',
    logo: '⚡',
    status: 'disconnected',
    commission: '5-25%',
    cookieDuration: '30 days',
    paymentTerms: 'Net 30',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  },
  {
    id: 'awin',
    name: 'Awin',
    logo: '🌍',
    status: 'disconnected',
    commission: '3-18%',
    cookieDuration: '30 days',
    paymentTerms: 'Net 30',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  },
  {
    id: 'clickbank',
    name: 'ClickBank',
    logo: '💰',
    status: 'disconnected',
    commission: '10-75%',
    cookieDuration: '60 days',
    paymentTerms: 'Weekly',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  },
  {
    id: 'flexoffers',
    name: 'FlexOffers',
    logo: '🔄',
    status: 'disconnected',
    commission: '5-40%',
    cookieDuration: '30 days',
    paymentTerms: 'Net 60',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    products: 0,
    lastSync: null,
    apiKey: null,
    metrics: {
      conversionRate: 0,
      avgOrderValue: 0,
      clickThrough: 0
    }
  }
];

export default function NetworksPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [tenantId, setTenantId] = useState<string>('');
  const [networks, setNetworks] = useState(AFFILIATE_NETWORKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch tenant details and networks from API
    // For now, use mock data
    setTimeout(() => {
      setTenantId('mock-tenant-id');
      setLoading(false);
    }, 100);
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-neutral-400">Loading networks...</div>
      </div>
    );
  }

  return <AffiliateNetworksView 
    tenantSlug={tenantSlug}
    tenantId={tenantId}
    networks={networks}
  />;
}