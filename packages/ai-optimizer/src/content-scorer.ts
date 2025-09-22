import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';
import { ContentPerformance } from './types';

export class ContentScorer {
  private openai: OpenAI;
  private supabase: SupabaseClient;
  private performanceCache: Map<string, ContentPerformance> = new Map();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    openaiKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async scoreContent(
    contentId: string,
    content: string,
    contentType: 'article' | 'review' | 'comparison' | 'guide'
  ): Promise<ContentPerformance> {
    // Check cache
    const cached = this.performanceCache.get(contentId);
    if (cached) return cached;

    // Analyze content with multiple dimensions
    const [
      engagement,
      readability,
      sentiment,
      keywords,
      topicRelevance
    ] = await Promise.all([
      this.predictEngagement(content, contentType),
      this.calculateReadability(content),
      this.analyzeSentiment(content),
      this.extractKeywords(content),
      this.calculateTopicRelevance(content)
    ]);

    // Predict conversion impact
    const predictedConversions = await this.predictConversions(
      content,
      contentType,
      engagement,
      sentiment
    );

    const performance: ContentPerformance = {
      contentId,
      type: contentType,
      predictedEngagement: engagement,
      predictedConversions,
      topicRelevance,
      readability,
      sentiment,
      keywords
    };

    // Cache for 1 hour
    this.performanceCache.set(contentId, performance);
    setTimeout(() => this.performanceCache.delete(contentId), 3600000);

    return performance;
  }

  private async predictEngagement(
    content: string,
    type: ContentPerformance['type']
  ): Promise<number> {
    // Use OpenAI to analyze content quality and engagement potential
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert content analyst. Analyze the following ${type} content and predict its engagement score on a scale of 0-1, where 1 is highly engaging. Consider factors like:
              - Hook strength and opening
              - Value proposition clarity
              - Emotional appeal
              - Call-to-action effectiveness
              - Content structure and flow
              Return only a number between 0 and 1.`
          },
          {
            role: 'user',
            content: content.substring(0, 3000) // Limit to first 3000 chars
          }
        ],
        max_tokens: 10,
        temperature: 0.3
      });

      const score = parseFloat(response.choices[0]?.message?.content || '0.5');
      return Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error('Error predicting engagement:', error);
      return 0.5;
    }
  }

  private calculateReadability(content: string): number {
    // Flesch Reading Ease Score normalized to 0-1
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => 
      count + this.countSyllables(word), 0
    );

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const fleschScore = 206.835 - 
      (1.015 * avgWordsPerSentence) - 
      (84.6 * avgSyllablesPerWord);

    // Normalize to 0-1 (higher is better)
    // Score of 60-70 is considered optimal for general audience
    const normalized = Math.max(0, Math.min(100, fleschScore)) / 100;
    
    // Adjust so that 60-70 range gets highest score
    if (fleschScore >= 60 && fleschScore <= 70) {
      return 0.9 + (normalized * 0.1);
    }
    return normalized * 0.9;
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    let count = 0;
    const vowels = 'aeiouy';
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Adjust for silent e
    if (word.endsWith('e')) {
      count--;
    }

    // Ensure at least 1 syllable
    return Math.max(1, count);
  }

  private async analyzeSentiment(content: string): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the following content. Return a score between -1 (very negative) and 1 (very positive). Return only the number.'
          },
          {
            role: 'user',
            content: content.substring(0, 2000)
          }
        ],
        max_tokens: 10,
        temperature: 0.3
      });

      const score = parseFloat(response.choices[0]?.message?.content || '0');
      return Math.max(-1, Math.min(1, score));
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 0;
    }
  }

  private async extractKeywords(content: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract the top 10 most important keywords or phrases from the content. Return as a comma-separated list.'
          },
          {
            role: 'user',
            content: content.substring(0, 2000)
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      });

      const keywords = response.choices[0]?.message?.content || '';
      return keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    } catch (error) {
      console.error('Error extracting keywords:', error);
      return [];
    }
  }

  private async calculateTopicRelevance(
    content: string,
  ): Promise<number> {
    // Fetch trending topics
    const { data: trendingTopics } = await this.supabase
      .from('trending_topics')
      .select('topic, score')
      .gte('timestamp', subDays(new Date(), 7).toISOString())
      .order('score', { ascending: false })
      .limit(20);

    if (!trendingTopics?.length) return 0.5;

    // Check content relevance to trending topics
    let relevanceScore = 0;
    const contentLower = content.toLowerCase();

    for (const { topic, score } of trendingTopics) {
      if (contentLower.includes(topic.toLowerCase())) {
        relevanceScore += score * 0.1;
      }
    }

    return Math.min(1, relevanceScore);
  }

  private async predictConversions(
    content: string,
    type: string,
    engagement: number,
    sentiment: number
  ): Promise<number> {
    // Analyze conversion-driving elements
    const conversionFactors = await this.analyzeConversionFactors(content);

    // Weight factors based on content type
    const weights = {
      engagement: 0.2,
      sentiment: 0.1,
      cta: 0.3,
      benefits: 0.2,
      urgency: 0.1,
      social_proof: 0.1
    };

    if (type === 'review') {
      weights.sentiment = 0.2;
      weights.social_proof = 0.2;
    } else if (type === 'comparison') {
      weights.benefits = 0.3;
      weights.cta = 0.2;
    }

    const score =
      engagement * weights.engagement +
      Math.max(0, sentiment) * weights.sentiment +
      conversionFactors.cta * weights.cta +
      conversionFactors.benefits * weights.benefits +
      conversionFactors.urgency * weights.urgency +
      conversionFactors.social_proof * weights.social_proof;

    return Math.min(1, score);
  }

  private async analyzeConversionFactors(content: string): Promise<{
    cta: number;
    benefits: number;
    urgency: number;
    social_proof: number;
  }> {
    const contentLower = content.toLowerCase();

    // CTA presence and strength
    const ctaPhrases = [
      'buy now', 'shop now', 'get it', 'order today',
      'limited time', 'don\'t miss', 'click here',
      'learn more', 'discover', 'explore'
    ];
    const ctaScore = ctaPhrases.reduce((score, phrase) => 
      contentLower.includes(phrase) ? score + 0.15 : score, 0
    );

    // Benefits mentioned
    const benefitWords = [
      'save', 'discount', 'free', 'bonus', 'guarantee',
      'improve', 'better', 'best', 'top', 'premium',
      'exclusive', 'special', 'limited'
    ];
    const benefitScore = benefitWords.reduce((score, word) => 
      contentLower.includes(word) ? score + 0.1 : score, 0
    );

    // Urgency indicators
    const urgencyWords = [
      'now', 'today', 'limited', 'hurry', 'last chance',
      'ending soon', 'while supplies last', 'only'
    ];
    const urgencyScore = urgencyWords.reduce((score, word) => 
      contentLower.includes(word) ? score + 0.12 : score, 0
    );

    // Social proof
    const socialProofIndicators = [
      'review', 'rating', 'customer', 'testimonial',
      'recommend', 'love', 'favorite', 'popular',
      'bestseller', 'trending'
    ];
    const socialProofScore = socialProofIndicators.reduce((score, word) => 
      contentLower.includes(word) ? score + 0.1 : score, 0
    );

    return {
      cta: Math.min(1, ctaScore),
      benefits: Math.min(1, benefitScore),
      urgency: Math.min(1, urgencyScore),
      social_proof: Math.min(1, socialProofScore)
    };
  }

  async optimizeContent(
    content: string,
    targetMetric: 'engagement' | 'conversion' | 'readability'
  ): Promise<{
    original: ContentPerformance;
    suggestions: string[];
    optimized?: string;
  }> {
    const original = await this.scoreContent('temp', content, 'article');
    const suggestions: string[] = [];

    switch (targetMetric) {
      case 'engagement':
        if (original.predictedEngagement < 0.7) {
          suggestions.push('Strengthen the opening hook');
          suggestions.push('Add more emotional appeal');
          suggestions.push('Include questions to engage readers');
        }
        break;

      case 'conversion':
        if (original.predictedConversions < 0.5) {
          suggestions.push('Add stronger calls-to-action');
          suggestions.push('Highlight product benefits more clearly');
          suggestions.push('Include urgency or scarcity elements');
          suggestions.push('Add customer testimonials or reviews');
        }
        break;

      case 'readability':
        if (original.readability < 0.6) {
          suggestions.push('Break up long sentences');
          suggestions.push('Use simpler vocabulary');
          suggestions.push('Add more paragraph breaks');
          suggestions.push('Include bullet points or lists');
        }
        break;
    }

    // Generate optimized version using GPT
    let optimized: string | undefined;
    if (suggestions.length > 0) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `Improve the following content for better ${targetMetric}. Apply these suggestions: ${suggestions.join(', ')}`
            },
            {
              role: 'user',
              content: content.substring(0, 3000)
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        });

        optimized = response.choices[0]?.message?.content || undefined;
      } catch (error) {
        console.error('Error optimizing content:', error);
      }
    }

    return {
      original,
      suggestions,
      optimized
    };
  }

  async batchScore(
    contents: Array<{ id: string; content: string; type: 'article' | 'review' | 'comparison' | 'guide' }>
  ): Promise<ContentPerformance[]> {
    const results = await Promise.all(
      contents.map(({ id, content, type }) => 
        this.scoreContent(id, content, type)
      )
    );

    return results;
  }

  async compareVersions(
    versionA: string,
    versionB: string,
    contentType: 'article' | 'review' | 'comparison' | 'guide'
  ): Promise<{
    winner: 'A' | 'B';
    scoreA: ContentPerformance;
    scoreB: ContentPerformance;
    analysis: string;
  }> {
    const [scoreA, scoreB] = await Promise.all([
      this.scoreContent('versionA', versionA, contentType),
      this.scoreContent('versionB', versionB, contentType)
    ]);

    // Determine winner based on weighted score
    const overallA = 
      scoreA.predictedEngagement * 0.3 +
      scoreA.predictedConversions * 0.4 +
      scoreA.readability * 0.2 +
      scoreA.topicRelevance * 0.1;

    const overallB = 
      scoreB.predictedEngagement * 0.3 +
      scoreB.predictedConversions * 0.4 +
      scoreB.readability * 0.2 +
      scoreB.topicRelevance * 0.1;

    const winner = overallA > overallB ? 'A' : 'B';

    // Generate analysis
    const analysis = this.generateComparisonAnalysis(scoreA, scoreB, winner);

    return {
      winner,
      scoreA,
      scoreB,
      analysis
    };
  }

  private generateComparisonAnalysis(
    scoreA: ContentPerformance,
    scoreB: ContentPerformance,
    winner: 'A' | 'B'
  ): string {
    const analysis: string[] = [];

    const winnerScore = winner === 'A' ? scoreA : scoreB;
    const loserScore = winner === 'A' ? scoreB : scoreA;

    if (winnerScore.predictedEngagement > loserScore.predictedEngagement) {
      analysis.push(`Version ${winner} has ${((winnerScore.predictedEngagement - loserScore.predictedEngagement) * 100).toFixed(1)}% higher engagement potential`);
    }

    if (winnerScore.predictedConversions > loserScore.predictedConversions) {
      analysis.push(`Version ${winner} is predicted to drive ${((winnerScore.predictedConversions - loserScore.predictedConversions) * 100).toFixed(1)}% more conversions`);
    }

    if (Math.abs(scoreA.readability - scoreB.readability) > 0.1) {
      const moreReadable = scoreA.readability > scoreB.readability ? 'A' : 'B';
      analysis.push(`Version ${moreReadable} has better readability`);
    }

    return analysis.join('. ');
  }
}
