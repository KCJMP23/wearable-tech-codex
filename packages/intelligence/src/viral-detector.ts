import * as tf from '@tensorflow/tfjs-node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays, differenceInHours, format } from 'date-fns';
import { groupBy, orderBy, meanBy, maxBy } from 'lodash';
import {
  ContentEngagement,
  ViralPattern,
  IntelligenceConfig,
  IntelligenceError,
  DatabaseTables,
  IntelligenceUpdate
} from './types.js';

/**
 * Viral Content Detector
 * 
 * Identifies high-performing content patterns using engagement signals
 * and machine learning to predict viral potential.
 */
export class ViralDetector {
  private supabase: SupabaseClient<DatabaseTables>;
  private config: IntelligenceConfig;
  private viralModel: tf.LayersModel | null = null;
  private engagementThresholds: Map<string, number> = new Map();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: IntelligenceConfig = {
      minDataPoints: 20,
      confidenceThreshold: 0.8,
      privacyNoiseLevel: 0.05,
      updateFrequency: 60
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
    this.initializeViralModel();
    this.calculateEngagementThresholds();
  }

  /**
   * Detect viral content and patterns across the network
   */
  async detectViralContent(
    timeRange: number = 7,
    category?: string
  ): Promise<{
    viralContent: ContentEngagement[];
    patterns: ViralPattern[];
    insights: string[];
  }> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, timeRange);

      // Collect content engagement data
      const contentData = await this.collectContentEngagement(startDate, endDate, category);
      
      if (contentData.length < this.config.minDataPoints) {
        throw new IntelligenceError(
          'Insufficient content data for viral detection',
          'INSUFFICIENT_DATA',
          { dataPoints: contentData.length, required: this.config.minDataPoints }
        );
      }

      // Calculate engagement scores and viral coefficients
      const enrichedContent = await this.calculateEngagementMetrics(contentData);
      
      // Identify viral content using ML model
      const viralContent = await this.identifyViralContent(enrichedContent);
      
      // Extract viral patterns from successful content
      const patterns = await this.extractViralPatterns(viralContent);
      
      // Generate insights and recommendations
      const insights = this.generateViralInsights(viralContent, patterns);
      
      // Store viral content data
      await this.storeViralContent(viralContent);

      return {
        viralContent: orderBy(viralContent, 'viral_coefficient', 'desc'),
        patterns,
        insights
      };
    } catch (error) {
      if (error instanceof IntelligenceError) {
        throw error;
      }
      throw new IntelligenceError(
        'Failed to detect viral content',
        'VIRAL_DETECTION_FAILED',
        { error: error.message, category }
      );
    }
  }

  /**
   * Collect content engagement data from database
   */
  private async collectContentEngagement(
    startDate: Date,
    endDate: Date,
    category?: string
  ): Promise<any[]> {
    let query = this.supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        category,
        tenant_id,
        published_at,
        metadata,
        insights (
          type,
          value,
          created_at,
          metadata
        )
      `)
      .gte('published_at', startDate.toISOString())
      .lte('published_at', endDate.toISOString());

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Calculate engagement metrics for content
   */
  private async calculateEngagementMetrics(contentData: any[]): Promise<ContentEngagement[]> {
    const enrichedContent: ContentEngagement[] = [];

    for (const content of contentData) {
      const insights = groupBy(content.insights || [], 'type');
      
      // Extract engagement metrics from insights
      const views = this.sumInsightValues(insights.view || []);
      const shares = this.sumInsightValues(insights.share || []);
      const comments = this.sumInsightValues(insights.comment || []);
      const clicks = this.sumInsightValues(insights.click || []);
      const conversions = this.sumInsightValues(insights.conversion || []);
      
      // Calculate derived metrics
      const timeOnPage = this.calculateAverageTimeOnPage(insights.time || []);
      const bounceRate = this.calculateBounceRate(insights.bounce || []);
      const conversionRate = clicks > 0 ? conversions / clicks : 0;

      // Calculate viral coefficient
      const viralCoefficient = this.calculateViralCoefficient({
        views,
        shares,
        comments,
        timeOnPage,
        bounceRate
      });

      // Analyze content attributes
      const contentLength = content.content ? content.content.length : 0;
      const readabilityScore = this.calculateReadabilityScore(content.content || '');
      const keywordDensity = this.calculateKeywordDensity(content.title, content.content || '');

      // Determine content type
      const contentType = this.determineContentType(content.title, content.content || '');

      // Calculate engagement score
      const engagementScore = await this.calculateEngagementScore({
        views,
        shares,
        comments,
        timeOnPage,
        bounceRate,
        conversionRate,
        viralCoefficient
      });

      // Find peak engagement time
      const peakEngagementTime = this.findPeakEngagementTime(content.insights || []);

      const contentEngagement: ContentEngagement = {
        content_id: content.id,
        tenant_id: content.tenant_id,
        content_type: contentType,
        title: content.title,
        category: content.category,
        engagement_score: engagementScore,
        views,
        shares,
        comments,
        time_on_page: timeOnPage,
        bounce_rate: bounceRate,
        conversion_rate: conversionRate,
        viral_coefficient: viralCoefficient,
        content_length: contentLength,
        readability_score: readabilityScore,
        keyword_density: keywordDensity,
        published_at: new Date(content.published_at),
        peak_engagement_time: peakEngagementTime
      };

      enrichedContent.push(contentEngagement);
    }

    return enrichedContent;
  }

  /**
   * Identify viral content using ML model and thresholds
   */
  private async identifyViralContent(content: ContentEngagement[]): Promise<ContentEngagement[]> {
    const viralContent: ContentEngagement[] = [];

    for (const item of content) {
      let isViral = false;

      // Use ML model if available
      if (this.viralModel) {
        try {
          const viralProbability = await this.predictViralProbability(item);
          isViral = viralProbability > this.config.confidenceThreshold;
        } catch (error) {
          console.warn('ML viral prediction failed, using threshold method:', error);
          isViral = this.isViralByThreshold(item);
        }
      } else {
        isViral = this.isViralByThreshold(item);
      }

      if (isViral) {
        viralContent.push(item);
      }
    }

    return viralContent;
  }

  /**
   * Predict viral probability using ML model
   */
  private async predictViralProbability(content: ContentEngagement): Promise<number> {
    if (!this.viralModel) {
      throw new Error('Viral model not initialized');
    }

    const features = [
      content.engagement_score / 100,
      Math.log(content.views + 1) / 10,
      Math.log(content.shares + 1) / 5,
      Math.log(content.comments + 1) / 5,
      content.time_on_page / 300, // Normalize to 5 minutes
      1 - content.bounce_rate,
      content.conversion_rate,
      content.viral_coefficient,
      content.readability_score / 100,
      content.keyword_density
    ];

    const inputTensor = tf.tensor2d([features]);
    const prediction = this.viralModel.predict(inputTensor) as tf.Tensor;
    const probability = (await prediction.data())[0];

    inputTensor.dispose();
    prediction.dispose();

    return probability;
  }

  /**
   * Check if content is viral using threshold method
   */
  private isViralByThreshold(content: ContentEngagement): boolean {
    const categoryThreshold = this.engagementThresholds.get(content.category) || 50;
    
    return (
      content.engagement_score > categoryThreshold &&
      content.viral_coefficient > 1.5 &&
      (content.shares > 10 || content.comments > 5)
    );
  }

  /**
   * Extract viral patterns from successful content
   */
  private async extractViralPatterns(viralContent: ContentEngagement[]): Promise<ViralPattern[]> {
    const patterns: ViralPattern[] = [];

    // Group viral content by type and category
    const contentByType = groupBy(viralContent, 'content_type');
    const contentByCategory = groupBy(viralContent, 'category');

    // Analyze patterns by content type
    for (const [contentType, items] of Object.entries(contentByType)) {
      if (items.length < 3) continue; // Need at least 3 examples

      const pattern = await this.analyzeContentPattern(contentType, items);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    // Analyze patterns by category
    for (const [category, items] of Object.entries(contentByCategory)) {
      if (items.length < 3) continue;

      const pattern = await this.analyzeCategoryPattern(category, items);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return orderBy(patterns, 'success_probability', 'desc');
  }

  /**
   * Analyze content type pattern
   */
  private async analyzeContentPattern(
    contentType: string,
    items: ContentEngagement[]
  ): Promise<ViralPattern | null> {
    const avgEngagement = meanBy(items, 'engagement_score');
    const avgViralCoefficient = meanBy(items, 'viral_coefficient');
    
    if (avgEngagement < 60) return null; // Not strong enough pattern

    // Extract common attributes
    const avgLength = meanBy(items, 'content_length');
    const avgReadability = meanBy(items, 'readability_score');
    const avgKeywordDensity = meanBy(items, 'keyword_density');

    // Find optimal timing
    const optimalTiming = this.findOptimalTiming(items);

    // Calculate success probability
    const successProbability = Math.min(0.95, avgViralCoefficient / 5);

    return {
      pattern_id: `type_${contentType}_${Date.now()}`,
      content_type: contentType,
      engagement_threshold: avgEngagement,
      viral_indicators: this.extractViralIndicators(items),
      success_probability: successProbability,
      optimal_timing: optimalTiming,
      content_attributes: {
        avg_length: avgLength,
        avg_readability: avgReadability,
        avg_keyword_density: avgKeywordDensity,
        common_elements: this.findCommonElements(items)
      }
    };
  }

  /**
   * Analyze category pattern
   */
  private async analyzeCategoryPattern(
    category: string,
    items: ContentEngagement[]
  ): Promise<ViralPattern | null> {
    const avgEngagement = meanBy(items, 'engagement_score');
    const avgViralCoefficient = meanBy(items, 'viral_coefficient');
    
    if (avgEngagement < 55) return null;

    const optimalTiming = this.findOptimalTiming(items);
    const successProbability = Math.min(0.9, avgViralCoefficient / 4);

    return {
      pattern_id: `category_${category}_${Date.now()}`,
      content_type: 'mixed',
      engagement_threshold: avgEngagement,
      viral_indicators: this.extractViralIndicators(items),
      success_probability: successProbability,
      optimal_timing: optimalTiming,
      content_attributes: {
        category,
        seasonal_trends: this.analyzeSeasonalTrends(items),
        top_content_types: this.getTopContentTypes(items)
      }
    };
  }

  /**
   * Extract viral indicators from content
   */
  private extractViralIndicators(items: ContentEngagement[]): string[] {
    const indicators: string[] = [];
    
    const avgShares = meanBy(items, 'shares');
    const avgComments = meanBy(items, 'comments');
    const avgTimeOnPage = meanBy(items, 'time_on_page');
    const avgBounceRate = meanBy(items, 'bounce_rate');

    if (avgShares > 20) indicators.push('high_shareability');
    if (avgComments > 10) indicators.push('high_engagement');
    if (avgTimeOnPage > 180) indicators.push('high_retention');
    if (avgBounceRate < 0.3) indicators.push('low_bounce_rate');
    
    // Analyze content titles for patterns
    const titles = items.map(item => item.title.toLowerCase());
    if (titles.some(title => title.includes('how to'))) indicators.push('how_to_format');
    if (titles.some(title => title.includes('best'))) indicators.push('best_of_format');
    if (titles.some(title => /\d+/.test(title))) indicators.push('numbered_lists');

    return indicators;
  }

  /**
   * Find optimal timing for content publication
   */
  private findOptimalTiming(items: ContentEngagement[]): string[] {
    const timingData = items
      .filter(item => item.peak_engagement_time)
      .map(item => ({
        hour: item.peak_engagement_time!.getHours(),
        day: item.peak_engagement_time!.getDay(),
        engagement: item.engagement_score
      }));

    if (timingData.length < 3) return ['weekday_morning'];

    // Find best performing hours
    const hourGroups = groupBy(timingData, 'hour');
    const bestHours = Object.entries(hourGroups)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgEngagement: meanBy(data, 'engagement')
      }))
      .filter(h => h.avgEngagement > 60)
      .map(h => `${h.hour}:00`)
      .slice(0, 3);

    return bestHours.length > 0 ? bestHours : ['weekday_morning'];
  }

  /**
   * Generate insights from viral content analysis
   */
  private generateViralInsights(
    viralContent: ContentEngagement[],
    patterns: ViralPattern[]
  ): string[] {
    const insights: string[] = [];

    if (viralContent.length === 0) {
      insights.push('No viral content detected in the current time period');
      return insights;
    }

    // Analyze top performing content types
    const contentTypes = groupBy(viralContent, 'content_type');
    const topType = maxBy(Object.entries(contentTypes), ([_, items]) => items.length)?.[0];
    
    if (topType) {
      insights.push(`${topType} content shows the highest viral potential`);
    }

    // Analyze engagement patterns
    const avgEngagement = meanBy(viralContent, 'engagement_score');
    insights.push(`Viral content averages ${avgEngagement.toFixed(1)} engagement score`);

    // Analyze timing patterns
    const peakHours = viralContent
      .filter(c => c.peak_engagement_time)
      .map(c => c.peak_engagement_time!.getHours());
    
    if (peakHours.length > 0) {
      const commonHour = this.findMostCommon(peakHours);
      insights.push(`Peak engagement typically occurs around ${commonHour}:00`);
    }

    // Analyze content attributes
    const avgLength = meanBy(viralContent, 'content_length');
    insights.push(`Viral content averages ${Math.round(avgLength)} characters`);

    const avgReadability = meanBy(viralContent, 'readability_score');
    if (avgReadability > 70) {
      insights.push('High readability scores correlate with viral success');
    }

    // Pattern-based insights
    if (patterns.length > 0) {
      const topPattern = patterns[0];
      insights.push(`Most successful pattern: ${topPattern.content_type} with ${(topPattern.success_probability * 100).toFixed(1)}% success rate`);
    }

    return insights;
  }

  /**
   * Store viral content data
   */
  private async storeViralContent(viralContent: ContentEngagement[]): Promise<void> {
    if (viralContent.length === 0) return;

    const { error } = await this.supabase
      .from('viral_content')
      .upsert(
        viralContent.map(content => ({ ...content, id: content.content_id })),
        { onConflict: 'content_id' }
      );

    if (error) throw error;
  }

  /**
   * Calculate engagement score using weighted formula
   */
  private async calculateEngagementScore(metrics: {
    views: number;
    shares: number;
    comments: number;
    timeOnPage: number;
    bounceRate: number;
    conversionRate: number;
    viralCoefficient: number;
  }): Promise<number> {
    const {
      views,
      shares,
      comments,
      timeOnPage,
      bounceRate,
      conversionRate,
      viralCoefficient
    } = metrics;

    // Weighted scoring system
    const viewScore = Math.min(20, Math.log(views + 1) * 2);
    const shareScore = Math.min(25, shares * 2);
    const commentScore = Math.min(20, comments * 3);
    const timeScore = Math.min(15, timeOnPage / 10);
    const bounceScore = Math.min(10, (1 - bounceRate) * 10);
    const conversionScore = Math.min(10, conversionRate * 100);

    return viewScore + shareScore + commentScore + timeScore + bounceScore + conversionScore;
  }

  /**
   * Calculate viral coefficient
   */
  private calculateViralCoefficient(metrics: {
    views: number;
    shares: number;
    comments: number;
    timeOnPage: number;
    bounceRate: number;
  }): number {
    const { views, shares, comments, timeOnPage, bounceRate } = metrics;
    
    if (views === 0) return 0;

    // Viral coefficient = (shares + comments) / views * engagement_factor
    const engagementFactor = (timeOnPage / 60) * (1 - bounceRate);
    return ((shares + comments) / views) * engagementFactor * 100;
  }

  /**
   * Helper methods for content analysis
   */
  private sumInsightValues(insights: any[]): number {
    return insights.reduce((sum, insight) => sum + (parseFloat(insight.value) || 0), 0);
  }

  private calculateAverageTimeOnPage(timeInsights: any[]): number {
    if (timeInsights.length === 0) return 0;
    return meanBy(timeInsights, insight => parseFloat(insight.value) || 0);
  }

  private calculateBounceRate(bounceInsights: any[]): number {
    if (bounceInsights.length === 0) return 0.5; // Default assumption
    return meanBy(bounceInsights, insight => parseFloat(insight.value) || 0);
  }

  private calculateReadabilityScore(content: string): number {
    // Simple readability score based on sentence and word length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = words.reduce((sum, word) => 
      sum + this.countSyllables(word), 0) / words.length;

    // Simplified Flesch Reading Ease Score
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (const char of word.toLowerCase()) {
      const isVowel = vowels.includes(char);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    return Math.max(1, count);
  }

  private calculateKeywordDensity(title: string, content: string): number {
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const contentWords = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (contentWords.length === 0) return 0;

    let matches = 0;
    for (const titleWord of titleWords) {
      matches += contentWords.filter(w => w.includes(titleWord)).length;
    }

    return matches / contentWords.length;
  }

  private determineContentType(title: string, content: string): 'article' | 'review' | 'comparison' | 'guide' | 'list' {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    if (titleLower.includes('review') || contentLower.includes('pros and cons')) {
      return 'review';
    }
    if (titleLower.includes('vs') || titleLower.includes('compare') || contentLower.includes('comparison')) {
      return 'comparison';
    }
    if (titleLower.includes('how to') || titleLower.includes('guide') || contentLower.includes('step')) {
      return 'guide';
    }
    if (/\d+/.test(titleLower) && (titleLower.includes('best') || titleLower.includes('top'))) {
      return 'list';
    }

    return 'article';
  }

  private findPeakEngagementTime(insights: any[]): Date | undefined {
    if (insights.length === 0) return undefined;

    // Find the time with highest engagement activity
    const timeGroups = groupBy(insights, insight => 
      format(new Date(insight.created_at), 'yyyy-MM-dd HH:00')
    );

    const peakTime = maxBy(
      Object.entries(timeGroups),
      ([_, groupInsights]) => groupInsights.length
    )?.[0];

    return peakTime ? new Date(peakTime) : undefined;
  }

  private findMostCommon<T>(array: T[]): T | undefined {
    const counts = new Map<T, number>();
    
    for (const item of array) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon: T | undefined;

    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }

  private findCommonElements(items: ContentEngagement[]): string[] {
    // Extract common elements from viral content
    const elements: string[] = [];
    
    const titles = items.map(item => item.title);
    
    if (titles.some(title => title.includes('Ultimate'))) elements.push('ultimate_keyword');
    if (titles.some(title => title.includes('Complete'))) elements.push('complete_keyword');
    if (titles.some(title => /\d{4}/.test(title))) elements.push('year_in_title');

    return elements;
  }

  private analyzeSeasonalTrends(items: ContentEngagement[]): any {
    const monthGroups = groupBy(items, item => item.published_at.getMonth());
    
    return Object.entries(monthGroups).map(([month, items]) => ({
      month: parseInt(month),
      count: items.length,
      avgEngagement: meanBy(items, 'engagement_score')
    }));
  }

  private getTopContentTypes(items: ContentEngagement[]): any[] {
    const typeGroups = groupBy(items, 'content_type');
    
    return Object.entries(typeGroups)
      .map(([type, items]) => ({
        type,
        count: items.length,
        avgEngagement: meanBy(items, 'engagement_score')
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  /**
   * Initialize ML model for viral prediction
   */
  private async initializeViralModel(): Promise<void> {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [10], // 10 input features
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 8,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
          })
        ]
      });

      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      this.viralModel = model;
    } catch (error) {
      console.warn('Failed to initialize viral ML model:', error);
    }
  }

  /**
   * Calculate engagement thresholds by category
   */
  private async calculateEngagementThresholds(): Promise<void> {
    try {
      const { data: historicalData } = await this.supabase
        .from('viral_content')
        .select('category, engagement_score')
        .gte('created_at', subDays(new Date(), 90).toISOString());

      if (historicalData && historicalData.length > 0) {
        const categoryGroups = groupBy(historicalData, 'category');
        
        for (const [category, data] of Object.entries(categoryGroups)) {
          const scores = data.map(d => d.engagement_score).sort((a, b) => a - b);
          const percentile75 = scores[Math.floor(scores.length * 0.75)];
          this.engagementThresholds.set(category, percentile75 || 50);
        }
      }
    } catch (error) {
      console.warn('Failed to calculate engagement thresholds:', error);
    }
  }

  /**
   * Predict viral potential for new content
   */
  async predictViralPotential(content: {
    title: string;
    content_text: string;
    category: string;
    content_type?: string;
  }): Promise<{
    viral_probability: number;
    predicted_engagement: number;
    recommendations: string[];
    optimal_timing: string[];
  }> {
    try {
      // Analyze content attributes
      const contentLength = content.content_text.length;
      const readabilityScore = this.calculateReadabilityScore(content.content_text);
      const keywordDensity = this.calculateKeywordDensity(content.title, content.content_text);
      const contentType = content.content_type || this.determineContentType(content.title, content.content_text);

      // Find similar successful content
      const { data: similarContent } = await this.supabase
        .from('viral_content')
        .select('*')
        .eq('category', content.category)
        .eq('content_type', contentType)
        .gte('engagement_score', 60)
        .limit(10);

      let viralProbability = 0.3; // Base probability
      let predictedEngagement = 40; // Base engagement
      const recommendations: string[] = [];

      if (similarContent && similarContent.length > 0) {
        const avgEngagement = meanBy(similarContent, 'engagement_score');
        const avgLength = meanBy(similarContent, 'content_length');
        const avgReadability = meanBy(similarContent, 'readability_score');

        // Adjust predictions based on similar content
        predictedEngagement = avgEngagement * 0.8; // Conservative estimate

        // Length comparison
        const lengthRatio = contentLength / avgLength;
        if (lengthRatio > 0.8 && lengthRatio < 1.2) {
          viralProbability += 0.1;
        } else {
          recommendations.push('Consider adjusting content length to match successful content');
        }

        // Readability comparison
        if (readabilityScore >= avgReadability * 0.9) {
          viralProbability += 0.15;
        } else {
          recommendations.push('Improve readability for better engagement');
        }

        // Use ML model if available
        if (this.viralModel) {
          try {
            const features = [
              predictedEngagement / 100,
              0, // views (unknown for new content)
              0, // shares (unknown)
              0, // comments (unknown)
              120, // estimated time on page
              0.4, // estimated bounce rate
              0.02, // estimated conversion rate
              1.0, // estimated viral coefficient
              readabilityScore / 100,
              keywordDensity
            ];

            const inputTensor = tf.tensor2d([features]);
            const prediction = this.viralModel.predict(inputTensor) as tf.Tensor;
            viralProbability = (await prediction.data())[0];

            inputTensor.dispose();
            prediction.dispose();
          } catch (error) {
            console.warn('ML prediction failed:', error);
          }
        }
      }

      // Get optimal timing from patterns
      const optimalTiming = await this.getOptimalTimingForCategory(content.category);

      return {
        viral_probability: Math.min(0.95, viralProbability),
        predicted_engagement: predictedEngagement,
        recommendations,
        optimal_timing: optimalTiming
      };
    } catch (error) {
      throw new IntelligenceError(
        'Failed to predict viral potential',
        'VIRAL_PREDICTION_FAILED',
        { error: error.message }
      );
    }
  }

  /**
   * Get optimal timing for a category
   */
  private async getOptimalTimingForCategory(category: string): Promise<string[]> {
    const { data: categoryContent } = await this.supabase
      .from('viral_content')
      .select('peak_engagement_time, engagement_score')
      .eq('category', category)
      .not('peak_engagement_time', 'is', null)
      .limit(20);

    if (!categoryContent || categoryContent.length === 0) {
      return ['weekday_morning', '10:00', '14:00'];
    }

    const timingData = categoryContent.map(item => ({
      hour: new Date(item.peak_engagement_time).getHours(),
      engagement: item.engagement_score
    }));

    const hourGroups = groupBy(timingData, 'hour');
    const bestHours = Object.entries(hourGroups)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgEngagement: meanBy(data, 'engagement')
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3)
      .map(h => `${h.hour}:00`);

    return bestHours.length > 0 ? bestHours : ['weekday_morning', '10:00', '14:00'];
  }

  /**
   * Setup real-time viral content monitoring
   */
  async setupRealtimeMonitoring(callback: (update: IntelligenceUpdate) => void): Promise<void> {
    const subscription = this.supabase
      .channel('viral-updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insights' },
        async (payload) => {
          try {
            const { new: newData } = payload;
            
            // Check if this is engagement data that might indicate viral content
            if (['view', 'share', 'comment'].includes(newData.type) && newData.content_id) {
              const viralUpdate = await this.analyzeRealtimeEngagement(newData);
              
              if (viralUpdate) {
                callback({
                  type: 'viral',
                  data: viralUpdate,
                  timestamp: new Date(),
                  priority: 'high'
                });
              }
            }
          } catch (error) {
            console.error('Error processing real-time viral update:', error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Analyze real-time engagement for viral potential
   */
  private async analyzeRealtimeEngagement(newData: any): Promise<any> {
    // Get recent engagement data for this content
    const { data: recentEngagement } = await this.supabase
      .from('insights')
      .select('type, value, created_at')
      .eq('content_id', newData.content_id)
      .gte('created_at', subDays(new Date(), 1).toISOString())
      .order('created_at', { ascending: false });

    if (!recentEngagement || recentEngagement.length < 5) return null;

    // Calculate recent engagement velocity
    const hourlyEngagement = groupBy(recentEngagement, insight => 
      format(new Date(insight.created_at), 'yyyy-MM-dd HH:00')
    );

    const recentHours = Object.keys(hourlyEngagement).sort().slice(-3);
    let totalRecentEngagement = 0;

    for (const hour of recentHours) {
      totalRecentEngagement += hourlyEngagement[hour].length;
    }

    // Check if engagement is accelerating
    if (totalRecentEngagement > 20) { // High engagement threshold
      return {
        content_id: newData.content_id,
        engagement_velocity: totalRecentEngagement,
        message: 'Content showing viral engagement patterns',
        urgency: 'high'
      };
    }

    return null;
  }
}