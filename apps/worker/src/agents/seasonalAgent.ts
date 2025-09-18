import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';

interface SeasonalAgentInput {
  tenantId: string;
  action: 'apply_seasonal_theme' | 'generate_seasonal_content' | 'update_promotions' | 'analyze_trends';
  season?: 'spring' | 'summer' | 'fall' | 'winter' | 'holiday';
  forceApply?: boolean;
}

interface SeasonalRule {
  name: string;
  start: { month: number; day: number };
  end: { month: number; day: number };
  tokens: {
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  contentFocus: string[];
  promotions: string[];
}

export class SeasonalAgent extends BaseAgent {
  name = 'SeasonalAgent';
  description = 'Applies seasonal themes, generates timely content, and manages holiday promotions based on date rules';
  version = '1.0.0';

  private readonly seasonalRules: SeasonalRule[] = [
    {
      name: 'Holiday Glow',
      start: { month: 11, day: 20 },
      end: { month: 12, day: 31 },
      tokens: { 
        accent: '#F97316', 
        background: '#1A1A1A', 
        text: '#FFE3C4', 
        muted: '#FBBF24' 
      },
      contentFocus: ['holiday gift guides', 'year-end reviews', 'new year fitness goals'],
      promotions: ['Black Friday deals', 'Holiday gift recommendations', 'Year-end roundups']
    },
    {
      name: 'Spring Reset',
      start: { month: 3, day: 1 },
      end: { month: 4, day: 30 },
      tokens: { 
        accent: '#34D399', 
        background: '#F0FDF4', 
        text: '#064E3B', 
        muted: '#6EE7B7' 
      },
      contentFocus: ['spring fitness routines', 'outdoor activity tracking', 'health goal setting'],
      promotions: ['Spring fitness challenges', 'Outdoor gear recommendations', 'Fresh start guides']
    },
    {
      name: 'Summer Active',
      start: { month: 6, day: 1 },
      end: { month: 8, day: 31 },
      tokens: { 
        accent: '#06B6D4', 
        background: '#F0F9FF', 
        text: '#0C4A6E', 
        muted: '#67E8F9' 
      },
      contentFocus: ['summer workouts', 'water resistance guides', 'vacation fitness tracking'],
      promotions: ['Summer sports gear', 'Waterproof wearables', 'Vacation essentials']
    },
    {
      name: 'Back to School',
      start: { month: 8, day: 15 },
      end: { month: 9, day: 30 },
      tokens: { 
        accent: '#8B5CF6', 
        background: '#FAF5FF', 
        text: '#581C87', 
        muted: '#C4B5FD' 
      },
      contentFocus: ['student wellness', 'productivity tracking', 'study break workouts'],
      promotions: ['Student discounts', 'Productivity wearables', 'Back to routine guides']
    },
    {
      name: 'Winter Wellness',
      start: { month: 1, day: 1 },
      end: { month: 2, day: 28 },
      tokens: { 
        accent: '#3B82F6', 
        background: '#F8FAFC', 
        text: '#1E3A8A', 
        muted: '#93C5FD' 
      },
      contentFocus: ['indoor fitness', 'winter wellness tips', 'seasonal affective disorder'],
      promotions: ['Indoor workout gear', 'Winter wellness', 'New year motivation']
    }
  ];

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as SeasonalAgentInput;
      
      switch (input.action) {
        case 'apply_seasonal_theme':
          return await this.applySeasonalTheme(input.tenantId, input.forceApply, deps);
        case 'generate_seasonal_content':
          return await this.generateSeasonalContent(input.tenantId, input.season, deps);
        case 'update_promotions':
          return await this.updatePromotions(input.tenantId, deps);
        case 'analyze_trends':
          return await this.analyzeSeasonalTrends(input.tenantId, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async applySeasonalTheme(
    tenantId: string, 
    forceApply: boolean = false, 
    deps: AgentDependencies
  ): Promise<any> {
    const today = new Date();
    const activeRule = this.findActiveRule(today);
    
    if (!activeRule && !forceApply) {
      return { 
        action: 'no_theme_applied',
        message: 'No seasonal rule active for current date',
        currentDate: today.toISOString().split('T')[0]
      };
    }

    const ruleToApply = activeRule || this.seasonalRules[0]; // Default to first rule if forced

    // Get current tenant theme
    const { data: tenant } = await deps.supabase
      .from('tenants')
      .select('theme, color_tokens')
      .eq('id', tenantId)
      .single();

    // Update tenant with seasonal theme
    const { error } = await deps.supabase
      .from('tenants')
      .update({
        color_tokens: ruleToApply.tokens,
        theme: {
          ...tenant?.theme,
          seasonal: ruleToApply.name,
          appliedAt: new Date().toISOString(),
          isActive: true
        }
      })
      .eq('id', tenantId);

    if (error) {
      throw new Error(`Failed to apply seasonal theme: ${error.message}`);
    }

    // Schedule seasonal content
    await this.scheduleSeasonalContent(tenantId, ruleToApply, deps);

    return {
      action: 'theme_applied',
      seasonalTheme: ruleToApply.name,
      themePeriod: `${ruleToApply.start.month}/${ruleToApply.start.day} - ${ruleToApply.end.month}/${ruleToApply.end.day}`,
      colorTokens: ruleToApply.tokens,
      contentScheduled: ruleToApply.contentFocus.length,
      promotionsActivated: ruleToApply.promotions.length
    };
  }

  private async generateSeasonalContent(
    tenantId: string,
    season?: string,
    deps?: AgentDependencies
  ): Promise<any> {
    const activeRule = season 
      ? this.seasonalRules.find(rule => rule.name.toLowerCase().includes(season.toLowerCase()))
      : this.findActiveRule(new Date());

    if (!activeRule) {
      return {
        action: 'no_seasonal_content',
        message: 'No active seasonal rule found'
      };
    }

    const contentIdeas = [];

    // Generate content ideas based on seasonal focus
    for (const focus of activeRule.contentFocus) {
      const idea = {
        title: this.generateSeasonalTitle(focus, activeRule.name),
        type: this.selectContentType(focus),
        topic: focus,
        urgency: 'high',
        seasonalRelevance: activeRule.name,
        keywords: this.generateSeasonalKeywords(focus),
        promotionalAngle: activeRule.promotions.find(p => 
          p.toLowerCase().includes(focus.split(' ')[0])
        )
      };

      contentIdeas.push(idea);

      // Schedule in calendar
      const runDate = new Date();
      runDate.setDate(runDate.getDate() + contentIdeas.length);

      await deps!.supabase
        .from('calendar')
        .insert({
          tenant_id: tenantId,
          item_type: 'post',
          title: idea.title,
          status: 'planned',
          run_at: runDate.toISOString(),
          meta: {
            agent: 'EditorialAgent',
            action: 'generate_posts',
            type: idea.type,
            topic: idea.topic,
            seasonal: true,
            seasonalTheme: activeRule.name,
            keywords: idea.keywords
          }
        });
    }

    return {
      action: 'seasonal_content_generated',
      seasonalTheme: activeRule.name,
      contentIdeas: contentIdeas.length,
      ideas: contentIdeas,
      scheduledInCalendar: contentIdeas.length
    };
  }

  private async updatePromotions(tenantId: string, deps: AgentDependencies): Promise<any> {
    const activeRule = this.findActiveRule(new Date());
    
    if (!activeRule) {
      return {
        action: 'no_promotions_updated',
        message: 'No active seasonal rule'
      };
    }

    // Get top products that match seasonal focus
    const { data: products } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('rating', { ascending: false })
      .limit(10);

    const seasonalPromotions = [];

    for (const promotion of activeRule.promotions) {
      const relevantProducts = this.findRelevantProducts(products || [], promotion);
      
      const promotionData = {
        title: promotion,
        products: relevantProducts.slice(0, 3),
        theme: activeRule.name,
        startDate: this.getRuleStartDate(activeRule),
        endDate: this.getRuleEndDate(activeRule),
        promotionalMessage: this.generatePromotionalMessage(promotion, activeRule.name)
      };

      seasonalPromotions.push(promotionData);

      // Create promotional content
      await this.createPromotionalContent(tenantId, promotionData, deps);
    }

    return {
      action: 'promotions_updated',
      seasonalTheme: activeRule.name,
      totalPromotions: seasonalPromotions.length,
      promotions: seasonalPromotions
    };
  }

  private async analyzeSeasonalTrends(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Analyze seasonal performance from previous years
    const currentMonth = new Date().getMonth() + 1;
    const seasonalData = this.getSeasonalTrendData(currentMonth);

    // Store seasonal insights
    await deps.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'seasonal_trends',
        value: seasonalData.trendScore,
        window: 'seasonal',
        meta: seasonalData,
        computed_at: new Date().toISOString()
      });

    return {
      action: 'seasonal_trends_analyzed',
      currentMonth,
      trendScore: seasonalData.trendScore,
      recommendations: seasonalData.recommendations,
      upcomingOpportunities: seasonalData.upcoming,
      historicalPerformance: seasonalData.historical
    };
  }

  // Helper methods
  private findActiveRule(date: Date): SeasonalRule | null {
    return this.seasonalRules.find(rule => this.isDateInRange(date, rule.start, rule.end));
  }

  private isDateInRange(
    date: Date, 
    start: { month: number; day: number }, 
    end: { month: number; day: number }
  ): boolean {
    const year = date.getFullYear();
    const startDate = new Date(year, start.month - 1, start.day);
    const endDate = new Date(year, end.month - 1, end.day);
    
    // Handle year wrap-around (e.g., holiday season)
    if (end.month < start.month) {
      const nextYearEnd = new Date(year + 1, end.month - 1, end.day);
      return date >= startDate || date <= nextYearEnd;
    }
    
    return date >= startDate && date <= endDate;
  }

  private async scheduleSeasonalContent(
    tenantId: string, 
    rule: SeasonalRule, 
    deps: AgentDependencies
  ): Promise<void> {
    // Schedule content for the next 7 days
    for (let i = 0; i < Math.min(rule.contentFocus.length, 7); i++) {
      const runDate = new Date();
      runDate.setDate(runDate.getDate() + i + 1);

      await deps.supabase
        .from('calendar')
        .insert({
          tenant_id: tenantId,
          item_type: 'post',
          title: `Seasonal: ${rule.contentFocus[i]}`,
          status: 'planned',
          run_at: runDate.toISOString(),
          meta: {
            agent: 'EditorialAgent',
            seasonal: true,
            theme: rule.name,
            focus: rule.contentFocus[i]
          }
        });
    }
  }

  private generateSeasonalTitle(focus: string, themeName: string): string {
    const templates = [
      `The Ultimate Guide to ${focus} - ${themeName} Edition`,
      `${focus}: Everything You Need to Know This Season`,
      `Mastering ${focus} - ${themeName} Tips & Tricks`,
      `${focus} Made Simple - Seasonal Insights`
    ];

    return templates[Math.floor(Math.random() * templates.length)]
      .replace(focus, focus.charAt(0).toUpperCase() + focus.slice(1));
  }

  private selectContentType(focus: string): string {
    if (focus.includes('guide') || focus.includes('tips')) return 'howto';
    if (focus.includes('review') || focus.includes('roundup')) return 'roundup';
    if (focus.includes('best') || focus.includes('top')) return 'listicle';
    return 'evergreen';
  }

  private generateSeasonalKeywords(focus: string): string[] {
    const baseKeywords = focus.split(' ');
    const seasonalKeywords = [
      new Date().getFullYear().toString(),
      'seasonal',
      'trending',
      'latest',
      'updated'
    ];
    
    return [...baseKeywords, ...seasonalKeywords].slice(0, 8);
  }

  private getRuleStartDate(rule: SeasonalRule): string {
    const year = new Date().getFullYear();
    return new Date(year, rule.start.month - 1, rule.start.day).toISOString();
  }

  private getRuleEndDate(rule: SeasonalRule): string {
    const year = new Date().getFullYear();
    const adjustedYear = rule.end.month < rule.start.month ? year + 1 : year;
    return new Date(adjustedYear, rule.end.month - 1, rule.end.day).toISOString();
  }

  private findRelevantProducts(products: any[], promotion: string): any[] {
    // Simple relevance matching - in real implementation, use more sophisticated matching
    const keywords = promotion.toLowerCase().split(' ');
    
    return products.filter(product => {
      const productText = `${product.title} ${product.category} ${product.device_type}`.toLowerCase();
      return keywords.some(keyword => productText.includes(keyword));
    });
  }

  private generatePromotionalMessage(promotion: string, theme: string): string {
    return `🎉 ${theme} Special: ${promotion}! Discover the perfect wearable technology for this season. Limited time insights and recommendations.`;
  }

  private async createPromotionalContent(
    tenantId: string, 
    promotion: any, 
    deps: AgentDependencies
  ): Promise<void> {
    const runDate = new Date();
    runDate.setDate(runDate.getDate() + 2);

    await deps.supabase
      .from('calendar')
      .insert({
        tenant_id: tenantId,
        item_type: 'post',
        title: promotion.title,
        status: 'planned',
        run_at: runDate.toISOString(),
        meta: {
          agent: 'EditorialAgent',
          action: 'generate_posts',
          type: 'roundup',
          promotional: true,
          products: promotion.products.map((p: any) => p.id),
          theme: promotion.theme,
          message: promotion.promotionalMessage
        }
      });
  }

  private getSeasonalTrendData(month: number): any {
    // Mock seasonal trend analysis
    const trends = {
      1: { trendScore: 85, focus: 'New Year fitness goals' },
      2: { trendScore: 70, focus: 'Winter wellness' },
      3: { trendScore: 90, focus: 'Spring fitness prep' },
      6: { trendScore: 95, focus: 'Summer activity tracking' },
      11: { trendScore: 100, focus: 'Holiday shopping' },
      12: { trendScore: 98, focus: 'Year-end reviews' }
    };

    const currentTrend = trends[month as keyof typeof trends] || { trendScore: 60, focus: 'General wellness' };

    return {
      trendScore: currentTrend.trendScore,
      currentFocus: currentTrend.focus,
      recommendations: [
        `Focus on ${currentTrend.focus} content`,
        'Align product recommendations with seasonal needs',
        'Increase posting frequency during high-trend periods'
      ],
      upcoming: ['Black Friday preparation', 'Holiday gift guides'],
      historical: {
        lastYear: currentTrend.trendScore - 10,
        growth: '+15% seasonal engagement'
      }
    };
  }
}

export const seasonalAgent = new SeasonalAgent();