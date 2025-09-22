import { createClient, SupabaseClient } from '@supabase/supabase-js';
import kmeans from 'ml-kmeans';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { UserSegment } from './types';

type InteractionAction = 'view' | 'click' | 'add_to_cart' | 'purchase';

interface InteractionRecord {
  user_id?: string;
  timestamp: string | Date;
  action: InteractionAction;
  value?: number | null;
  product_category?: string | null;
  device_type?: string | null;
}

type InteractionSessions = InteractionRecord[][];

export interface BrowsingPatterns {
  avgSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  preferredDevices: string[];
  peakActivityHours: number[];
}

export interface ConversionFunnel {
  viewToClick: number;
  clickToCart: number;
  cartToPurchase: number;
}

export interface UserPatterns {
  preferredCategories: string[];
  purchaseFrequency: number;
  avgOrderValue: number;
  browsingPatterns: BrowsingPatterns;
  conversionFunnel: ConversionFunnel;
}

export interface UserAnalysis {
  patterns: UserPatterns;
  segment: string;
  churnRisk: number;
  ltv: number;
}

interface KMeansResult {
  clusters: number[];
  centroids: Array<{ centroid: number[]; error: number; size: number }>;
  iterations: number;
  converged: boolean;
}

type KMeansFunction = (
  data: number[][],
  clusters: number,
  options?: Record<string, unknown>
) => KMeansResult;

interface AnalyticsSummaryRow {
  total_spent?: number | null;
  purchase_count?: number | null;
  avg_order_value?: number | null;
  days_since_last_purchase?: number | null;
  session_count?: number | null;
  avg_session_duration?: number | null;
  category_diversity?: number | null;
  conversion_rate?: number | null;
  top_categories?: string[] | null;
  primary_device?: string | null;
}

export class BehaviorAnalyzer {
  private supabase: SupabaseClient;
  private segmentCache: Map<string, UserSegment> = new Map();
  private userSegmentMap: Map<string, string> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async analyzeUserBehavior(
    userId: string,
    timeframe: number = 30 // days
  ): Promise<UserAnalysis> {
    const startDate = subDays(new Date(), timeframe);

    // Fetch user interactions
    const { data: interactions } = await this.supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    const interactionRecords: InteractionRecord[] = (interactions ?? []) as InteractionRecord[];

    if (!interactionRecords.length) {
      return this.getDefaultUserAnalysis();
    }

    // Analyze patterns
    const patterns = this.extractUserPatterns(interactionRecords);
    
    // Determine segment
    const segment = await this.assignUserSegment(userId, patterns);
    
    // Calculate churn risk
    const churnRisk = await this.calculateChurnRisk(interactionRecords);
    
    // Calculate LTV
    const ltv = this.calculateLTV(patterns, churnRisk);

    return {
      patterns,
      segment,
      churnRisk,
      ltv
    };
  }

  private extractUserPatterns(
    interactions: InteractionRecord[],
  ): UserPatterns {
    // Category preferences
    const categoryCount = new Map<string, number>();
    const sessions = this.groupIntoSessions(interactions);
    
    let totalSpent = 0;
    let purchaseCount = 0;
    let totalViews = 0;
    let totalClicks = 0;
    let totalCarts = 0;

    for (const interaction of interactions) {
      if (interaction.product_category) {
        categoryCount.set(
          interaction.product_category,
          (categoryCount.get(interaction.product_category) || 0) + 1
        );
      }

      switch (interaction.action) {
        case 'purchase':
          totalSpent += interaction.value || 0;
          purchaseCount++;
          break;
        case 'view':
          totalViews++;
          break;
        case 'click':
          totalClicks++;
          break;
        case 'add_to_cart':
          totalCarts++;
          break;
      }
    }

    // Sort categories by frequency
    const preferredCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Calculate browsing patterns
    const browsingPatterns = this.analyzeBrowsingPatterns(sessions);

    // Calculate conversion funnel
    const conversionFunnel = {
      viewToClick: totalViews > 0 ? totalClicks / totalViews : 0,
      clickToCart: totalClicks > 0 ? totalCarts / totalClicks : 0,
      cartToPurchase: totalCarts > 0 ? purchaseCount / totalCarts : 0
    };

    // Calculate purchase metrics
    const daysSinceFirst = Math.max(1, 
      Math.floor((Date.now() - new Date(interactions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24))
    );
    const purchaseFrequency = purchaseCount / (daysSinceFirst / 30);
    const avgOrderValue = purchaseCount > 0 ? totalSpent / purchaseCount : 0;

    return {
      preferredCategories,
      purchaseFrequency,
      avgOrderValue,
      browsingPatterns,
      conversionFunnel
    };
  }

  private groupIntoSessions(
    interactions: InteractionRecord[],
    sessionTimeout: number = 30 // minutes
  ): InteractionSessions {
    const sessions: InteractionSessions = [];
    let currentSession: InteractionRecord[] = [];
    let lastTimestamp: Date | null = null;

    for (const interaction of interactions) {
      const timestamp = new Date(interaction.timestamp);
      
      if (lastTimestamp && 
          (timestamp.getTime() - lastTimestamp.getTime()) > sessionTimeout * 60 * 1000) {
        if (currentSession.length > 0) {
          sessions.push(currentSession);
          currentSession = [];
        }
      }
      
      currentSession.push(interaction);
      lastTimestamp = timestamp;
    }

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  private analyzeBrowsingPatterns(sessions: InteractionSessions): BrowsingPatterns {
    if (sessions.length === 0) {
      return {
        avgSessionDuration: 0,
        pagesPerSession: 0,
        bounceRate: 0,
        preferredDevices: [],
        peakActivityHours: []
      };
    }

    let totalDuration = 0;
    let totalPages = 0;
    let bounces = 0;
    const deviceCount = new Map<string, number>();
    const hourActivity = new Map<number, number>();

    for (const session of sessions) {
      // Session duration
      if (session.length > 1) {
        const duration = new Date(session[session.length - 1].timestamp).getTime() - 
                        new Date(session[0].timestamp).getTime();
        totalDuration += duration;
      }

      // Pages per session
      totalPages += session.length;

      // Bounce rate (sessions with only 1 interaction)
      if (session.length === 1) {
        bounces++;
      }

      // Device tracking
      for (const interaction of session) {
        if (interaction.device_type) {
          deviceCount.set(
            interaction.device_type,
            (deviceCount.get(interaction.device_type) || 0) + 1
          );
        }

        // Hour tracking
        const hour = new Date(interaction.timestamp).getHours();
        hourActivity.set(hour, (hourActivity.get(hour) || 0) + 1);
      }
    }

    // Calculate averages
    const avgSessionDuration = totalDuration / sessions.length / 1000 / 60; // in minutes
    const pagesPerSession = totalPages / sessions.length;
    const bounceRate = bounces / sessions.length;

    // Get preferred devices
    const preferredDevices = Array.from(deviceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([device]) => device);

    // Get peak activity hours
    const peakActivityHours = Array.from(hourActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    return {
      avgSessionDuration,
      pagesPerSession,
      bounceRate,
      preferredDevices,
      peakActivityHours
    };
  }

  async segmentUsers(
    minUsers: number = 100
  ): Promise<UserSegment[]> {
    // Fetch user data for clustering
    const { data: userRows } = await this.supabase
      .from('user_analytics_summary')
      .select('*')
      .limit(10000);

    const userSummaries = (userRows ?? []) as AnalyticsSummaryRow[];
    const totalUsers = userSummaries.length;

    if (totalUsers < minUsers) {
      console.warn('Insufficient users for segmentation');
      return [];
    }

    // Prepare features for clustering
    const features = userSummaries.map(user => [
      user.total_spent || 0,
      user.purchase_count || 0,
      user.avg_order_value || 0,
      user.days_since_last_purchase || 365,
      user.session_count || 0,
      user.avg_session_duration || 0,
      user.category_diversity || 0,
      user.conversion_rate || 0
    ]);

    // Normalize features
    const normalized = this.normalizeFeatures(features);

    // Perform k-means clustering
    const k = Math.max(1, Math.min(5, Math.floor(totalUsers / 20) || 1));
    const runKMeans = kmeans as unknown as KMeansFunction;
    const result = runKMeans(normalized, k, {
      initialization: 'kmeans++',
      maxIterations: 100
    }) as KMeansResult;

    // Create segment definitions
    const segments: UserSegment[] = [];
    
    for (let i = 0; i < k; i++) {
      const clusterUsers = userSummaries.filter((_, idx) => result.clusters[idx] === i);
      
      if (clusterUsers.length === 0) continue;

      const segment = await this.defineSegment(clusterUsers, `segment_${i}`);
      segments.push(segment);

      // Cache segment
      this.segmentCache.set(segment.segmentId, segment);
    }

    // Sort segments by value
    segments.sort((a, b) => b.value - a.value);

    // Assign meaningful names
    this.assignSegmentNames(segments);

    return segments;
  }

  private normalizeFeatures(features: number[][]): number[][] {
    const numFeatures = features[0].length;
    const mins = new Array(numFeatures).fill(Infinity);
    const maxs = new Array(numFeatures).fill(-Infinity);

    // Find min and max for each feature
    for (const row of features) {
      for (let i = 0; i < numFeatures; i++) {
        mins[i] = Math.min(mins[i], row[i]);
        maxs[i] = Math.max(maxs[i], row[i]);
      }
    }

    // Normalize to 0-1
    return features.map(row => 
      row.map((val, i) => {
        const range = maxs[i] - mins[i];
        return range > 0 ? (val - mins[i]) / range : 0;
      })
    );
  }

  private async defineSegment(
    users: AnalyticsSummaryRow[],
    segmentId: string
  ): Promise<UserSegment> {
    // Calculate segment characteristics
    const avgOrderValue = users.reduce((sum, u) => sum + (u.avg_order_value || 0), 0) / users.length;
    const avgPurchaseCount = users.reduce((sum, u) => sum + (u.purchase_count || 0), 0) / users.length;
    const avgDaysSinceLastPurchase = users.reduce((sum, u) => sum + (u.days_since_last_purchase || 0), 0) / users.length;

    // Get preferred categories
    const categoryMap = new Map<string, number>();
    for (const user of users) {
      if (user.top_categories) {
        for (const category of user.top_categories) {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        }
      }
    }
    const preferredCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    // Calculate segment value (simplified LTV)
    const segmentValue = avgOrderValue * avgPurchaseCount * 12; // Annual value

    // Calculate churn risk
    const churnRisk = this.calculateSegmentChurnRisk(avgDaysSinceLastPurchase, avgPurchaseCount);

    // Determine price range
    const prices = users.map(u => u.avg_order_value || 0).sort((a, b) => a - b);
    const lowerIndex = prices.length
      ? Math.floor(Math.min(prices.length - 1, Math.max(0, prices.length * 0.25)))
      : 0;
    const upperIndex = prices.length
      ? Math.floor(Math.min(prices.length - 1, Math.max(0, prices.length * 0.75)))
      : 0;
    const priceRange: [number, number] = [
      prices[lowerIndex] ?? 0,
      prices[upperIndex] ?? 0
    ];

    // Get common devices
    const deviceMap = new Map<string, number>();
    for (const user of users) {
      if (user.primary_device) {
        deviceMap.set(user.primary_device, (deviceMap.get(user.primary_device) || 0) + 1);
      }
    }
    const deviceTypes = Array.from(deviceMap.keys());

    return {
      segmentId,
      name: segmentId, // Will be updated later
      characteristics: {
        avgOrderValue,
        purchaseFrequency: avgPurchaseCount / 12, // Monthly frequency
        preferredCategories,
        priceRange,
        deviceTypes
      },
      size: users.length,
      value: segmentValue,
      churnRisk
    };
  }

  private calculateSegmentChurnRisk(
    avgDaysSinceLastPurchase: number,
    avgPurchaseCount: number
  ): number {
    // Simple churn risk calculation
    let risk = 0;

    // Days since last purchase factor
    if (avgDaysSinceLastPurchase > 180) risk += 0.5;
    else if (avgDaysSinceLastPurchase > 90) risk += 0.3;
    else if (avgDaysSinceLastPurchase > 60) risk += 0.15;

    // Purchase frequency factor
    if (avgPurchaseCount < 2) risk += 0.3;
    else if (avgPurchaseCount < 5) risk += 0.15;

    return Math.min(1, risk);
  }

  private assignSegmentNames(segments: UserSegment[]): void {
    for (const segment of segments) {
      const { characteristics, value, churnRisk } = segment;

      if (value > 1000 && characteristics.purchaseFrequency > 1) {
        segment.name = 'VIP Customers';
      } else if (value > 500 && churnRisk < 0.3) {
        segment.name = 'Loyal Customers';
      } else if (characteristics.avgOrderValue > 100) {
        segment.name = 'High Value Shoppers';
      } else if (characteristics.purchaseFrequency < 0.5 && churnRisk > 0.5) {
        segment.name = 'At Risk';
      } else if (characteristics.purchaseFrequency < 0.2) {
        segment.name = 'New or Dormant';
      } else {
        segment.name = 'Regular Customers';
      }
    }
  }

  async assignUserSegment(
    userId: string,
    patterns: UserPatterns
  ): Promise<string> {
    // Check if user already assigned
    const cached = this.userSegmentMap.get(userId);
    if (cached) return cached;

    // Get segments if not loaded
    if (this.segmentCache.size === 0) {
      await this.segmentUsers();
    }

    // Find best matching segment
    let bestSegment = 'default';
    let bestScore = 0;

    for (const [segmentId, segment] of this.segmentCache) {
      const score = this.calculateSegmentMatchScore(patterns, segment);
      if (score > bestScore) {
        bestScore = score;
        bestSegment = segmentId;
      }
    }

    // Cache assignment
    this.userSegmentMap.set(userId, bestSegment);

    return bestSegment;
  }

  private calculateSegmentMatchScore(
    patterns: UserPatterns,
    segment: UserSegment
  ): number {
    let score = 0;

    // AOV similarity
    const avgOrderValue = Math.max(1, segment.characteristics.avgOrderValue);
    const aovDiff = Math.abs(patterns.avgOrderValue - segment.characteristics.avgOrderValue);
    score += Math.max(0, 1 - aovDiff / avgOrderValue) * 0.3;

    // Purchase frequency similarity
    const freqDiff = Math.abs(patterns.purchaseFrequency - segment.characteristics.purchaseFrequency);
    score += Math.max(0, 1 - freqDiff / Math.max(1, segment.characteristics.purchaseFrequency)) * 0.3;

    // Category overlap
    const categoryOverlap = patterns.preferredCategories.filter(cat =>
      segment.characteristics.preferredCategories.includes(cat)
    ).length;
    score += (categoryOverlap / Math.max(1, patterns.preferredCategories.length)) * 0.2;

    // Price range match
    if (patterns.avgOrderValue >= segment.characteristics.priceRange[0] &&
        patterns.avgOrderValue <= segment.characteristics.priceRange[1]) {
      score += 0.2;
    }

    return score;
  }

  async calculateChurnRisk(
    interactions: InteractionRecord[]
  ): Promise<number> {
    // Get last purchase date
    const lastPurchase = interactions
      .filter(i => i.action === 'purchase')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!lastPurchase) return 0.8; // High risk if never purchased

    const daysSinceLastPurchase = Math.floor(
      (Date.now() - new Date(lastPurchase.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get purchase frequency
    const purchases = interactions.filter(i => i.action === 'purchase');
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(interactions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedPurchaseInterval = daysSinceFirst / Math.max(1, purchases.length);

    // Calculate risk factors
    let risk = 0;

    // Time since last purchase
    if (daysSinceLastPurchase > expectedPurchaseInterval * 2) {
      risk += 0.4;
    } else if (daysSinceLastPurchase > expectedPurchaseInterval * 1.5) {
      risk += 0.2;
    }

    // Declining engagement
    const recentInteractions = interactions.filter(i => 
      new Date(i.timestamp) > subDays(new Date(), 30)
    );
    const olderInteractions = interactions.filter(i => 
      new Date(i.timestamp) > subDays(new Date(), 60) &&
      new Date(i.timestamp) <= subDays(new Date(), 30)
    );

    if (recentInteractions.length < olderInteractions.length * 0.5) {
      risk += 0.3;
    }

    // Low overall engagement
    if (interactions.length < 10) {
      risk += 0.2;
    }

    // No recent views
    const recentViews = recentInteractions.filter(i => i.action === 'view');
    if (recentViews.length === 0) {
      risk += 0.1;
    }

    return Math.min(1, risk);
  }

  private calculateLTV(
    patterns: UserPatterns,
    churnRisk: number
  ): number {
    const aov = patterns.avgOrderValue || 0;
    const frequency = patterns.purchaseFrequency || 0;
    const expectedLifetime = Math.max(0, 1 - churnRisk) * 24; // months

    return aov * frequency * expectedLifetime;
  }

  private getDefaultUserAnalysis(): UserAnalysis {
    return {
      patterns: {
        preferredCategories: [],
        purchaseFrequency: 0,
        avgOrderValue: 0,
        browsingPatterns: {
          avgSessionDuration: 0,
          pagesPerSession: 0,
          bounceRate: 1,
          preferredDevices: [],
          peakActivityHours: []
        },
        conversionFunnel: {
          viewToClick: 0,
          clickToCart: 0,
          cartToPurchase: 0
        }
      },
      segment: 'new',
      churnRisk: 0.5,
      ltv: 0
    };
  }

  async getRealTimeInsights(): Promise<{
    activeUsers: number;
    currentRevenue: number;
    topProducts: string[];
    alerts: string[];
  }> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Active users
    const { data: activeUsers } = await this.supabase
      .from('user_interactions')
      .select('user_id', { count: 'exact', head: true })
      .gte('timestamp', hourAgo.toISOString());

    // Current revenue
    const { data: revenue } = await this.supabase
      .from('analytics')
      .select('revenue')
      .gte('timestamp', startOfDay(now).toISOString());

    const currentRevenue = revenue?.reduce((sum, r) => sum + r.revenue, 0) || 0;

    // Top products
    const { data: topProducts } = await this.supabase
      .from('analytics')
      .select('product_id, conversions')
      .gte('timestamp', startOfDay(now).toISOString())
      .order('conversions', { ascending: false })
      .limit(5);

    // Generate alerts
    const alerts = await this.generateAlerts(currentRevenue);

    return {
      activeUsers: activeUsers?.length || 0,
      currentRevenue,
      topProducts: topProducts?.map(p => p.product_id) || [],
      alerts
    };
  }

  private async generateAlerts(currentRevenue: number): Promise<string[]> {
    const alerts: string[] = [];

    // Compare to yesterday
    const yesterday = subDays(new Date(), 1);
    const { data: yesterdayRevenue } = await this.supabase
      .from('analytics')
      .select('revenue')
      .gte('timestamp', startOfDay(yesterday).toISOString())
      .lte('timestamp', endOfDay(yesterday).toISOString());

    const yesterdayTotal = yesterdayRevenue?.reduce((sum, r) => sum + r.revenue, 0) || 0;

    if (currentRevenue > yesterdayTotal * 1.2) {
      alerts.push('Revenue is 20% higher than yesterday!');
    } else if (currentRevenue < yesterdayTotal * 0.8) {
      alerts.push('Revenue is 20% lower than yesterday - investigate');
    }

    // Check for anomalies
    const { data: recentErrors } = await this.supabase
      .from('error_logs')
      .select('count')
      .gte('timestamp', subDays(new Date(), 1).toISOString());

    if (recentErrors && recentErrors.length > 100) {
      alerts.push('High error rate detected');
    }

    return alerts;
  }
}
