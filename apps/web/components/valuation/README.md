# Site Valuation System

A comprehensive site valuation calculator for affiliate platforms using multiple industry-standard methodologies.

## Features

- **Multiple Valuation Methods**: Revenue multiple, asset-based, traffic-based, and comparable analysis
- **Industry Standards**: 24x-48x monthly revenue multiples based on site characteristics
- **Confidence Scoring**: Data quality assessment for valuation reliability
- **Comparable Sites**: Database of sold affiliate sites for benchmarking
- **Historical Tracking**: Track valuation changes over time
- **Interactive Charts**: Visual representation of valuation trends and breakdowns

## Components

### ValuationCalculator

Main component for inputting site metrics and calculating valuations.

```tsx
import { ValuationCalculator } from '@/components/valuation';

<ValuationCalculator
  tenantId="your-tenant-id"
  onCalculationComplete={(result) => console.log(result)}
  initialData={{
    monthlyRevenue: 5000,
    monthlyPageviews: 100000,
    // ... other metrics
  }}
/>
```

### ValuationChart

Displays historical valuation data with trends and analytics.

```tsx
import { ValuationChart } from '@/components/valuation';

<ValuationChart
  valuations={valuationHistory}
  showRevenue={true}
  showMethodBreakdown={true}
/>
```

### ValuationMetrics

Comprehensive display of valuation results and key metrics.

```tsx
import { ValuationMetrics } from '@/components/valuation';

<ValuationMetrics
  result={valuationResult}
  metrics={inputMetrics}
/>
```

### ComparableSites

Search and display comparable site sales for benchmarking.

```tsx
import { ComparableSites } from '@/components/valuation';

<ComparableSites
  monthlyRevenue={5000}
  monthlyPageviews={100000}
  niche="technology"
  onSiteSelect={(site) => console.log(site)}
/>
```

## API Usage

### Calculate Valuation

```typescript
const response = await fetch('/api/valuation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'your-tenant-id',
    metrics: {
      monthlyRevenue: 5000,
      monthlyPageviews: 100000,
      revenueGrowthRate: 0.1,
      revenueConsistency: 0.8,
      // ... other metrics
    },
    saveToHistory: true,
  }),
});

const { data } = await response.json();
console.log(data.valuation);
```

### Get Valuation History

```typescript
const response = await fetch('/api/valuation?tenantId=your-tenant-id&limit=12');
const { data } = await response.json();
console.log(data); // Array of historical valuations
```

### Search Comparable Sites

```typescript
const response = await fetch('/api/valuation/comparables?' + new URLSearchParams({
  monthlyRevenue: '5000',
  monthlyPageviews: '100000',
  niche: 'technology',
  limit: '10',
}));

const { data, stats } = await response.json();
console.log(data); // Array of comparable sites
console.log(stats); // Market statistics
```

## Valuation Methods

### 1. Revenue Multiple Method

Industry standard approach using 24x-48x monthly revenue multiples:

- **Starter Sites**: 20x-28x (new sites, inconsistent revenue)
- **Established Sites**: 28x-36x (1+ years, consistent revenue)
- **Premium Sites**: 36x-48x (high authority, diversified traffic)

Adjustments based on:
- Growth rate (+20% for high growth, -30% for declining)
- Dependency risk (-20% for Amazon-heavy sites)
- Diversification (+15% for multiple revenue streams)
- Domain authority (+10% for DA 50+)

### 2. Asset-Based Valuation

Values the underlying assets:

- **Content**: $50-500 per post based on length and quality
- **Domain & SEO**: Domain authority, backlinks, ranking keywords
- **Traffic**: 12 months of monetizable pageview value
- **Technical**: Site performance and optimization

### 3. Traffic-Based Valuation

Monetizable pageview approach:

- **Value per 1000 pageviews**: $1-5 depending on niche and conversion
- **Quality adjustments**: Organic traffic %, engagement, bounce rate
- **24-month multiple**: Standard industry practice

### 4. Comparable Analysis

Uses actual sales data from:

- Flippa
- Empire Flippers
- FE International
- Motion Invest
- Direct sales

## Confidence Scoring

Valuation confidence is based on:

- **Data Quality**: Completeness and accuracy of input metrics
- **Revenue Consistency**: Historical revenue stability
- **Method Agreement**: How closely different methods align
- **Sample Size**: Number of comparable sites available

## Database Schema

### site_valuations
Stores comprehensive valuations with metrics and results.

### comparable_sites
Database of sold affiliate sites for benchmarking.

### valuation_benchmarks
Industry benchmarks and multipliers by niche and revenue range.

## Security & Rate Limiting

- **Authentication**: Required for all API endpoints
- **Rate Limiting**: 5 calculations per minute to prevent abuse
- **Tenant Isolation**: RLS policies ensure data separation
- **Admin Controls**: Only admins can manage comparable sites data

## Industry Benchmarks

Current market data (updated regularly):

- **Technology**: 30-42x average multiple
- **Health/Fitness**: 26-34x average multiple
- **Home/Garden**: 28x average multiple
- **Fashion/Beauty**: 24x average multiple (higher volatility)
- **General**: 25-31x average multiple

## Best Practices

1. **Accurate Data Entry**: Ensure all metrics are current and accurate
2. **Regular Updates**: Recalculate valuations monthly or quarterly
3. **Multiple Methods**: Consider all valuation methods, not just one
4. **Market Context**: Compare against similar sites in your niche
5. **Growth Trends**: Track changes over time to identify patterns
6. **Risk Assessment**: Consider dependency and diversification factors

## Troubleshooting

### Common Issues

1. **Low Confidence Score**: Improve data quality by providing more accurate metrics
2. **No Comparable Sites**: Broaden search criteria or consider different niches
3. **Method Disagreement**: Review input data for inconsistencies
4. **Rate Limiting**: Wait before making additional calculation requests

### Support

For technical issues or questions about valuation methodology, please refer to the platform documentation or contact support.