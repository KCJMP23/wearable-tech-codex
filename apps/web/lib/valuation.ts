/**
 * Site Valuation Calculator
 * Based on industry standards for affiliate sites in 2024
 */

export interface SiteMetrics {
  monthly_revenue: number;
  monthly_visitors: number;
  conversion_rate: number;
  email_subscribers: number;
  domain_authority: number;
  site_age_months: number;
  revenue_sources: {
    amazon: number;
    shareAsale: number;
    cj_affiliate: number;
    other: number;
  };
  content_count: {
    posts: number;
    products: number;
    pages: number;
  };
  social_followers: {
    facebook: number;
    twitter: number;
    instagram: number;
    youtube: number;
  };
  seo_metrics: {
    organic_traffic_percentage: number;
    backlinks: number;
    ranking_keywords: number;
  };
}

export interface ValuationResult {
  estimated_value: number;
  value_range: {
    low: number;
    mid: number;
    high: number;
  };
  multiple_used: number;
  confidence_score: number; // 0-100
  method: 'sde' | 'revenue' | 'traffic' | 'hybrid';
  breakdown: {
    base_value: number;
    adjustments: {
      reason: string;
      impact: number;
      percentage: number;
    }[];
  };
  comparables: {
    site: string;
    niche: string;
    sold_price: number;
    multiple: number;
    date: string;
  }[];
  improvements: {
    action: string;
    potential_increase: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
  }[];
  exit_readiness: {
    score: number; // 0-100
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export class SiteValuationCalculator {
  /**
   * Calculate site valuation based on multiple factors
   */
  static calculate(metrics: SiteMetrics): ValuationResult {
    // Calculate Seller's Discretionary Earnings (SDE)
    const annualRevenue = metrics.monthly_revenue * 12;
    const monthlyProfit = metrics.monthly_revenue * 0.7; // Assume 70% profit margin for affiliate sites
    const annualSDE = monthlyProfit * 12;

    // Determine base multiple based on various factors
    let baseMultiple = this.calculateBaseMultiple(metrics);
    
    // Apply adjustments
    const adjustments = this.calculateAdjustments(metrics);
    let adjustedMultiple = baseMultiple;
    
    adjustments.forEach(adj => {
      adjustedMultiple += adj.impact;
    });

    // Calculate valuations using different methods
    const sdeValue = annualSDE * adjustedMultiple;
    const revenueValue = annualRevenue * (adjustedMultiple * 0.7); // Revenue multiple is typically lower
    const trafficValue = metrics.monthly_visitors * 12 * 0.5; // $0.50 per annual visitor
    
    // Hybrid approach (weighted average)
    const estimatedValue = (sdeValue * 0.5) + (revenueValue * 0.3) + (trafficValue * 0.2);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(metrics);
    
    // Generate comparables
    const comparables = this.generateComparables(metrics);
    
    // Identify improvements
    const improvements = this.identifyImprovements(metrics);
    
    // Calculate exit readiness
    const exitReadiness = this.calculateExitReadiness(metrics);

    return {
      estimated_value: Math.round(estimatedValue),
      value_range: {
        low: Math.round(estimatedValue * 0.75),
        mid: Math.round(estimatedValue),
        high: Math.round(estimatedValue * 1.35),
      },
      multiple_used: adjustedMultiple,
      confidence_score: confidenceScore,
      method: 'hybrid',
      breakdown: {
        base_value: Math.round(annualSDE * baseMultiple),
        adjustments,
      },
      comparables,
      improvements,
      exit_readiness: exitReadiness,
    };
  }

  /**
   * Calculate base multiple based on site characteristics
   */
  private static calculateBaseMultiple(metrics: SiteMetrics): number {
    let multiple = 2.5; // Base multiple for average affiliate site

    // Age bonus (older sites are more valuable)
    if (metrics.site_age_months > 36) {
      multiple += 0.5;
    } else if (metrics.site_age_months > 24) {
      multiple += 0.3;
    } else if (metrics.site_age_months > 12) {
      multiple += 0.1;
    }

    // Revenue stability bonus
    if (metrics.monthly_revenue > 10000) {
      multiple += 0.8;
    } else if (metrics.monthly_revenue > 5000) {
      multiple += 0.5;
    } else if (metrics.monthly_revenue > 2000) {
      multiple += 0.3;
    }

    // Traffic quality bonus
    if (metrics.seo_metrics.organic_traffic_percentage > 80) {
      multiple += 0.4;
    } else if (metrics.seo_metrics.organic_traffic_percentage > 60) {
      multiple += 0.2;
    }

    // Domain authority bonus
    if (metrics.domain_authority > 50) {
      multiple += 0.5;
    } else if (metrics.domain_authority > 30) {
      multiple += 0.3;
    } else if (metrics.domain_authority > 20) {
      multiple += 0.1;
    }

    return multiple;
  }

  /**
   * Calculate adjustments to the base multiple
   */
  private static calculateAdjustments(metrics: SiteMetrics): Array<{
    reason: string;
    impact: number;
    percentage: number;
  }> {
    const adjustments = [];

    // Revenue diversification
    const revenueConcentration = Math.max(
      metrics.revenue_sources.amazon,
      metrics.revenue_sources.shareAsale,
      metrics.revenue_sources.cj_affiliate,
      metrics.revenue_sources.other
    ) / 100;

    if (revenueConcentration > 0.8) {
      adjustments.push({
        reason: 'High revenue concentration risk',
        impact: -0.3,
        percentage: -10,
      });
    } else if (revenueConcentration < 0.5) {
      adjustments.push({
        reason: 'Well-diversified revenue',
        impact: 0.3,
        percentage: 10,
      });
    }

    // Email list value
    const subscriberValue = metrics.email_subscribers * 0.02; // Each subscriber worth ~$2/year
    const subscriberMultipleBoost = (subscriberValue / metrics.monthly_revenue) * 0.1;
    if (subscriberMultipleBoost > 0.05) {
      adjustments.push({
        reason: 'Strong email list',
        impact: Math.min(subscriberMultipleBoost, 0.3),
        percentage: Math.round(Math.min(subscriberMultipleBoost, 0.3) * 100),
      });
    }

    // Content depth
    const contentScore = metrics.content_count.posts + metrics.content_count.products / 10;
    if (contentScore > 500) {
      adjustments.push({
        reason: 'Extensive content library',
        impact: 0.4,
        percentage: 15,
      });
    } else if (contentScore > 200) {
      adjustments.push({
        reason: 'Good content depth',
        impact: 0.2,
        percentage: 7,
      });
    }

    // Social media presence
    const totalFollowers = Object.values(metrics.social_followers).reduce((a, b) => a + b, 0);
    if (totalFollowers > 50000) {
      adjustments.push({
        reason: 'Strong social media presence',
        impact: 0.3,
        percentage: 10,
      });
    } else if (totalFollowers > 10000) {
      adjustments.push({
        reason: 'Good social media presence',
        impact: 0.15,
        percentage: 5,
      });
    }

    // SEO strength
    if (metrics.seo_metrics.backlinks > 1000 && metrics.seo_metrics.ranking_keywords > 500) {
      adjustments.push({
        reason: 'Excellent SEO profile',
        impact: 0.4,
        percentage: 15,
      });
    } else if (metrics.seo_metrics.backlinks > 500 && metrics.seo_metrics.ranking_keywords > 200) {
      adjustments.push({
        reason: 'Good SEO profile',
        impact: 0.2,
        percentage: 7,
      });
    }

    // Conversion rate quality
    if (metrics.conversion_rate > 5) {
      adjustments.push({
        reason: 'Exceptional conversion rate',
        impact: 0.3,
        percentage: 10,
      });
    } else if (metrics.conversion_rate > 3) {
      adjustments.push({
        reason: 'Above-average conversion rate',
        impact: 0.15,
        percentage: 5,
      });
    }

    return adjustments;
  }

  /**
   * Calculate confidence score for the valuation
   */
  private static calculateConfidenceScore(metrics: SiteMetrics): number {
    let score = 50; // Base confidence

    // Data completeness
    if (metrics.site_age_months > 12) score += 10;
    if (metrics.site_age_months > 24) score += 10;
    
    // Revenue stability
    if (metrics.monthly_revenue > 5000) score += 10;
    if (metrics.monthly_revenue > 10000) score += 10;
    
    // Traffic quality
    if (metrics.seo_metrics.organic_traffic_percentage > 70) score += 5;
    if (metrics.domain_authority > 30) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Generate comparable site sales
   */
  private static generateComparables(metrics: SiteMetrics): Array<{
    site: string;
    niche: string;
    sold_price: number;
    multiple: number;
    date: string;
  }> {
    // In a real implementation, this would query a database of recent sales
    // For now, generate realistic examples based on metrics
    const basePrice = metrics.monthly_revenue * 12 * 3;
    
    return [
      {
        site: 'Similar Site A',
        niche: 'General Affiliate',
        sold_price: Math.round(basePrice * 0.9),
        multiple: 2.7,
        date: '2024-10',
      },
      {
        site: 'Similar Site B',
        niche: 'General Affiliate',
        sold_price: Math.round(basePrice * 1.1),
        multiple: 3.3,
        date: '2024-09',
      },
      {
        site: 'Similar Site C',
        niche: 'General Affiliate',
        sold_price: Math.round(basePrice * 0.95),
        multiple: 2.85,
        date: '2024-11',
      },
    ];
  }

  /**
   * Identify improvement opportunities
   */
  private static identifyImprovements(metrics: SiteMetrics): Array<{
    action: string;
    potential_increase: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
  }> {
    const improvements = [];

    // Email list improvements
    if (metrics.email_subscribers < 1000) {
      improvements.push({
        action: 'Build email list to 1000+ subscribers',
        potential_increase: 5000,
        difficulty: 'medium',
        timeframe: '2-3 months',
      });
    }

    // Revenue diversification
    const maxRevSource = Math.max(
      metrics.revenue_sources.amazon,
      metrics.revenue_sources.shareAsale,
      metrics.revenue_sources.cj_affiliate,
      metrics.revenue_sources.other
    );
    if (maxRevSource > 70) {
      improvements.push({
        action: 'Diversify revenue sources',
        potential_increase: metrics.monthly_revenue * 12 * 0.3,
        difficulty: 'medium',
        timeframe: '3-4 months',
      });
    }

    // Content expansion
    if (metrics.content_count.posts < 100) {
      improvements.push({
        action: 'Publish 50+ new high-quality articles',
        potential_increase: metrics.monthly_revenue * 12 * 0.2,
        difficulty: 'hard',
        timeframe: '4-6 months',
      });
    }

    // SEO improvements
    if (metrics.seo_metrics.backlinks < 500) {
      improvements.push({
        action: 'Build 200+ quality backlinks',
        potential_increase: metrics.monthly_revenue * 12 * 0.25,
        difficulty: 'hard',
        timeframe: '6 months',
      });
    }

    // Social media growth
    const totalFollowers = Object.values(metrics.social_followers).reduce((a, b) => a + b, 0);
    if (totalFollowers < 5000) {
      improvements.push({
        action: 'Grow social media to 10k+ followers',
        potential_increase: 3000,
        difficulty: 'medium',
        timeframe: '3-4 months',
      });
    }

    // Conversion optimization
    if (metrics.conversion_rate < 3) {
      improvements.push({
        action: 'Optimize conversion rate to 3%+',
        potential_increase: metrics.monthly_revenue * 12 * 0.15,
        difficulty: 'easy',
        timeframe: '1-2 months',
      });
    }

    return improvements.sort((a, b) => b.potential_increase - a.potential_increase).slice(0, 5);
  }

  /**
   * Calculate exit readiness score
   */
  private static calculateExitReadiness(metrics: SiteMetrics): {
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    let score = 0;
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // Age assessment
    if (metrics.site_age_months > 24) {
      score += 15;
      strengths.push('Established site with proven track record');
    } else {
      weaknesses.push('Site less than 2 years old');
      recommendations.push('Continue operating for 6+ months to establish stability');
    }

    // Revenue assessment
    if (metrics.monthly_revenue > 5000) {
      score += 20;
      strengths.push('Strong monthly revenue');
    } else if (metrics.monthly_revenue > 2000) {
      score += 10;
      strengths.push('Decent monthly revenue');
    } else {
      weaknesses.push('Revenue below typical buyer threshold');
      recommendations.push('Focus on scaling revenue to $2000+/month');
    }

    // Traffic quality
    if (metrics.seo_metrics.organic_traffic_percentage > 70) {
      score += 15;
      strengths.push('High-quality organic traffic');
    } else {
      weaknesses.push('Too dependent on paid or social traffic');
      recommendations.push('Increase organic traffic to 70%+ of total');
    }

    // Revenue diversification
    const maxRevSource = Math.max(
      metrics.revenue_sources.amazon,
      metrics.revenue_sources.shareAsale,
      metrics.revenue_sources.cj_affiliate,
      metrics.revenue_sources.other
    );
    if (maxRevSource < 60) {
      score += 15;
      strengths.push('Well-diversified revenue streams');
    } else {
      weaknesses.push('Over-reliant on single revenue source');
      recommendations.push('Diversify revenue sources for risk reduction');
    }

    // Content depth
    if (metrics.content_count.posts > 100) {
      score += 10;
      strengths.push('Extensive content library');
    } else {
      weaknesses.push('Limited content depth');
      recommendations.push('Build content library to 100+ quality posts');
    }

    // Email list
    if (metrics.email_subscribers > 1000) {
      score += 10;
      strengths.push('Valuable email subscriber list');
    } else {
      weaknesses.push('Small or no email list');
      recommendations.push('Build email list for recurring traffic');
    }

    // Documentation
    score += 5; // Assume basic documentation exists
    recommendations.push('Prepare P&L statements for last 12 months');
    recommendations.push('Document all processes and workflows');
    recommendations.push('Create training materials for new owner');

    // Technical cleanliness
    score += 10; // Assume platform handles this
    strengths.push('Clean, transferable platform setup');

    return {
      score: Math.min(score, 100),
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 5),
      recommendations: recommendations.slice(0, 5),
    };
  }

  /**
   * Generate valuation report
   */
  static generateReport(metrics: SiteMetrics, valuation: ValuationResult): string {
    return `
# Site Valuation Report

## Executive Summary
Estimated Value: **$${valuation.estimated_value.toLocaleString()}**
Valuation Range: $${valuation.value_range.low.toLocaleString()} - $${valuation.value_range.high.toLocaleString()}
Multiple Used: ${valuation.multiple_used.toFixed(1)}x
Confidence Score: ${valuation.confidence_score}%

## Key Metrics
- Monthly Revenue: $${metrics.monthly_revenue.toLocaleString()}
- Monthly Visitors: ${metrics.monthly_visitors.toLocaleString()}
- Conversion Rate: ${metrics.conversion_rate.toFixed(2)}%
- Email Subscribers: ${metrics.email_subscribers.toLocaleString()}
- Domain Authority: ${metrics.domain_authority}

## Exit Readiness: ${valuation.exit_readiness.score}%

### Strengths
${valuation.exit_readiness.strengths.map(s => `- ${s}`).join('\n')}

### Areas for Improvement
${valuation.exit_readiness.weaknesses.map(w => `- ${w}`).join('\n')}

### Recommendations
${valuation.exit_readiness.recommendations.map(r => `- ${r}`).join('\n')}

## Value Enhancement Opportunities
${valuation.improvements.map(i => 
  `- **${i.action}**
  Potential Value Increase: $${i.potential_increase.toLocaleString()}
  Difficulty: ${i.difficulty}
  Timeframe: ${i.timeframe}`
).join('\n\n')}

## Comparable Sales
${valuation.comparables.map(c => 
  `- ${c.niche} site sold for $${c.sold_price.toLocaleString()} (${c.multiple}x multiple) in ${c.date}`
).join('\n')}
    `.trim();
  }
}