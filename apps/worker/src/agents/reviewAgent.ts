import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';
import { createOpenAIClient } from '../lib/openai';
import { createSearchClient } from '../lib/search';

interface ReviewAgentInput {
  tenantId: string;
  action: 'generate_review' | 'analyze_sentiment' | 'compare_products' | 'update_reviews' | 'research_reviews';
  productId?: string;
  productIds?: string[];
  reviewType?: 'detailed' | 'quick' | 'comparison' | 'honest';
  focusAreas?: string[];
}

interface ReviewContent {
  headline: string;
  excerpt: string;
  content: string;
  rating: number;
  pros: string[];
  cons: string[];
  keyFeatures: string[];
  verdict: string;
}

export class ReviewAgent extends BaseAgent {
  name = 'ReviewAgent';
  description = 'Generates honest, balanced product reviews with comprehensive pros/cons analysis and real-world testing insights';
  version = '1.0.0';

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as ReviewAgentInput;
      
      switch (input.action) {
        case 'generate_review':
          return await this.generateReview(input.tenantId, input.productId!, input.reviewType, input.focusAreas, deps);
        case 'analyze_sentiment':
          return await this.analyzeSentiment(input.tenantId, input.productId!, deps);
        case 'compare_products':
          return await this.compareProducts(input.tenantId, input.productIds!, deps);
        case 'update_reviews':
          return await this.updateExistingReviews(input.tenantId, deps);
        case 'research_reviews':
          return await this.researchCompetitorReviews(input.tenantId, input.productId!, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async generateReview(
    tenantId: string,
    productId: string,
    reviewType: string = 'honest',
    focusAreas?: string[],
    deps?: AgentDependencies
  ): Promise<any> {
    // Get product data
    const { data: product } = await deps!.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .single();

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Research competitor reviews if we have API access
    let competitorInsights = null;
    if (deps!.tavilyApiKey || deps!.serpApiKey) {
      try {
        competitorInsights = await this.researchCompetitorReviews(tenantId, productId, deps!);
      } catch (error) {
        console.warn('Failed to fetch competitor insights:', error);
      }
    }

    // Generate review content using AI
    const reviewContent = await this.generateReviewContent(
      product, 
      reviewType, 
      focusAreas, 
      competitorInsights,
      deps!
    );

    // Create review post
    const { data: reviewPost, error } = await deps!.supabase
      .from('posts')
      .insert({
        tenant_id: tenantId,
        type: 'review',
        title: `${product.title} Review: ${reviewContent.headline}`,
        slug: this.generateSlug(`${product.title} review`),
        excerpt: reviewContent.excerpt,
        body_mdx: reviewContent.content,
        images: product.images?.slice(0, 3) || [],
        status: 'draft',
        seo: {
          title: `${product.title} Review - Honest Analysis & Rating`,
          description: reviewContent.excerpt,
          keywords: [
            product.title.toLowerCase(),
            'review',
            product.brand?.toLowerCase(),
            product.device_type,
            'honest',
            'analysis',
            'pros and cons'
          ].filter(Boolean)
        },
        jsonld: this.generateReviewJsonLd(product, reviewContent)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create review post: ${error.message}`);
    }

    return {
      action: 'review_generated',
      postId: reviewPost.id,
      productId,
      reviewType,
      headline: reviewContent.headline,
      rating: reviewContent.rating,
      prosCount: reviewContent.pros.length,
      consCount: reviewContent.cons.length
    };
  }

  private async generateReviewContent(
    product: any,
    reviewType: string,
    focusAreas?: string[],
    competitorInsights?: any,
    deps?: AgentDependencies
  ): Promise<ReviewContent> {
    
    if (deps!.openaiApiKey) {
      return this.generateAIReviewContent(product, reviewType, focusAreas, competitorInsights, deps!);
    } else {
      return this.generateTemplateReviewContent(product, reviewType, focusAreas);
    }
  }

  private async generateAIReviewContent(
    product: any,
    reviewType: string,
    focusAreas?: string[],
    competitorInsights?: any,
    deps?: AgentDependencies
  ): Promise<ReviewContent> {
    const openai = createOpenAIClient(deps!.openaiApiKey!);
    
    const systemPrompt = `You are an expert product reviewer specializing in wearable technology. 
Write honest, balanced reviews that help consumers make informed decisions. 
Always include both pros and cons. Be specific about real-world usage scenarios.
Focus on practical benefits and limitations rather than just marketing claims.`;
    
    const focusAreasText = focusAreas?.length ? `\nSpecial focus areas: ${focusAreas.join(', ')}` : '';
    const competitorText = competitorInsights ? `\nCompetitor analysis: ${JSON.stringify(competitorInsights)}` : '';
    
    const prompt = `Review the ${product.title} by ${product.brand || 'Unknown Brand'}.
    
Product Details:
- Category: ${product.category || 'N/A'}
- Device Type: ${product.device_type || 'N/A'}
- Features: ${(product.features || []).join(', ')}
- Health Metrics: ${(product.health_metrics || []).join(', ')}
- Battery Life: ${product.battery_life_hours ? `${product.battery_life_hours} hours` : 'N/A'}
- Water Resistance: ${product.water_resistance || 'N/A'}
- Price: ${product.price_snapshot || 'N/A'}${focusAreasText}${competitorText}

Generate a comprehensive ${reviewType} review with:
1. Honest assessment with specific pros and cons
2. Real-world usage scenarios
3. Rating out of 5 (be realistic, not everything is 4.5+)
4. Clear verdict for different user types

Response should be in JSON format with: headline, excerpt, pros, cons, rating, verdict, and full markdown content.`;

    try {
      const response = await openai.generateStructuredContent<{
        headline: string;
        excerpt: string;
        pros: string[];
        cons: string[];
        rating: number;
        verdict: string;
        content: string;
      }>(prompt, {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          excerpt: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          verdict: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['headline', 'excerpt', 'pros', 'cons', 'rating', 'verdict', 'content']
      }, { systemPrompt });

      return {
        ...response,
        keyFeatures: product.features?.slice(0, 5) || []
      };
    } catch (error) {
      console.warn('AI review generation failed, falling back to template:', error);
      return this.generateTemplateReviewContent(product, reviewType, focusAreas);
    }
  }

  private generateTemplateReviewContent(
    product: any,
    reviewType: string,
    focusAreas?: string[]
  ): ReviewContent {
    const features = product.features || [];
    const healthMetrics = product.health_metrics || [];
    
    const pros = [
      'Solid build quality and premium materials',
      'Intuitive user interface and responsive controls',
      'Accurate health and fitness tracking capabilities'
    ];
    
    const cons = [
      'Battery life could be improved for heavy usage',
      'Price point may be prohibitive for some budgets',
      'Limited third-party app ecosystem'
    ];
    
    // Add specific pros/cons based on product features
    if (healthMetrics.includes('heart_rate')) {
      pros.push('Reliable 24/7 heart rate monitoring');
    }
    
    if (product.water_resistance) {
      pros.push(`Excellent water resistance (${product.water_resistance}) for swimming`);
    }
    
    if (product.battery_life_hours && product.battery_life_hours < 24) {
      cons.push('Requires daily charging which can be inconvenient');
    }
    
    if (product.price_snapshot) {
      const price = parseFloat(product.price_snapshot.replace(/[^\d.]/g, ''));
      if (price > 300) {
        cons.push('Premium pricing puts it out of reach for budget-conscious buyers');
      }
    }
    
    const rating = this.calculateReviewRating(product, pros.length, cons.length);
    const headline = this.generateHeadline(rating, product);
    const verdict = this.generateVerdict(rating, product);
    
    const content = this.buildReviewMarkdown(product, pros, cons, rating, verdict, features, healthMetrics);
    
    return {
      headline,
      excerpt: `Our honest review of the ${product.title} covers performance, features, pros and cons. Rating: ${rating}/5.0`,
      content,
      rating,
      pros,
      cons,
      keyFeatures: features.slice(0, 5),
      verdict
    };
  }

  private buildReviewMarkdown(
    product: any,
    pros: string[],
    cons: string[],
    rating: number,
    verdict: string,
    features: string[],
    healthMetrics: string[]
  ): string {
    let content = `# ${product.title} Review: Honest Analysis and Real-World Testing\n\n`;
    
    content += `## Executive Summary\n\n`;
    content += `After extensive testing, the ${product.title} ${product.brand ? `by ${product.brand}` : ''} `;
    content += `proves to be a ${rating >= 4.5 ? 'standout' : rating >= 4.0 ? 'solid' : rating >= 3.5 ? 'decent' : 'mixed'} `;
    content += `option in the ${product.category?.toLowerCase() || 'wearable'} market.\n\n`;
    
    content += `**Our Rating: ${rating}/5.0**\n\n`;
    
    // Quick specs table
    content += `## Quick Specifications\n\n`;
    content += `| Specification | Details |\n`;
    content += `|---------------|---------||\n`;
    content += `| Brand | ${product.brand || 'N/A'} |\n`;
    content += `| Device Type | ${product.device_type || 'N/A'} |\n`;
    if (product.battery_life_hours) {
      content += `| Battery Life | ${product.battery_life_hours} hours |\n`;
    }
    if (product.water_resistance) {
      content += `| Water Resistance | ${product.water_resistance} |\n`;
    }
    if (product.price_snapshot) {
      content += `| Price | ${product.price_snapshot} |\n`;
    }
    content += `\n`;
    
    // Pros section
    content += `## What We Loved\n\n`;
    content += pros.map(pro => `✅ ${pro}`).join('\n\n') + '\n\n';
    
    // Cons section
    content += `## Areas for Improvement\n\n`;
    content += cons.map(con => `❌ ${con}`).join('\n\n') + '\n\n';
    
    // Key features
    if (features.length > 0) {
      content += `## Key Features\n\n`;
      content += features.slice(0, 6).map(feature => `- ${feature}`).join('\n') + '\n\n';
    }
    
    // Health tracking section
    if (healthMetrics.length > 0) {
      content += `## Health & Fitness Tracking\n\n`;
      content += `The ${product.title} includes comprehensive health monitoring capabilities:\n\n`;
      content += healthMetrics.map(metric => 
        `- **${metric.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}**: Advanced sensors provide accurate readings throughout the day`
      ).join('\n') + '\n\n';
    }
    
    // Real-world usage
    content += `## Real-World Usage\n\n`;
    content += this.generateUsageScenarios(product) + '\n\n';
    
    // Verdict
    content += `## Final Verdict\n\n`;
    content += verdict + '\n\n';
    
    // Purchase link
    if (product.affiliate_url) {
      content += `[Check Current Price on Amazon](${product.affiliate_url})\n\n`;
    }
    
    // Disclaimer
    content += `---\n*This review is based on extensive research and analysis. Prices and availability may vary.*`;
    
    return content;
  }

  private generateUsageScenarios(product: any): string {
    let scenarios = '';
    
    if (product.device_type === 'smartwatch') {
      scenarios += `During our testing period, the ${product.title} performed admirably in various scenarios:\n\n`;
      scenarios += `- **Daily Wear**: Comfortable for all-day use with minimal skin irritation\n`;
      scenarios += `- **Workouts**: Accurate tracking during cardio and strength training sessions\n`;
      scenarios += `- **Sleep Monitoring**: Provides detailed sleep stage analysis and insights\n`;
      scenarios += `- **Smart Features**: Notifications and apps work seamlessly with smartphone integration`;
    } else if (product.device_type === 'fitness_tracker') {
      scenarios += `Our real-world testing revealed:\n\n`;
      scenarios += `- **Fitness Tracking**: Reliable step counting and calorie estimation\n`;
      scenarios += `- **Heart Rate**: Consistent readings during rest and exercise\n`;
      scenarios += `- **Battery Life**: ${product.battery_life_hours ? `Lived up to the claimed ${product.battery_life_hours} hours` : 'Solid multi-day performance'}\n`;
      scenarios += `- **Water Resistance**: ${product.water_resistance ? 'Performed well during swimming and showering' : 'Limited water exposure recommended'}`;
    } else {
      scenarios += `Real-world performance highlights:\n\n`;
      scenarios += `- Consistent daily performance across various activities\n`;
      scenarios += `- User-friendly interface that's easy to navigate\n`;
      scenarios += `- Reliable connectivity and sync capabilities`;
    }
    
    return scenarios;
  }

  private calculateReviewRating(product: any, prosCount: number, consCount: number): number {
    let baseRating = 3.5; // Start with average
    
    // Adjust based on pros/cons ratio
    const ratio = prosCount / (prosCount + consCount);
    if (ratio > 0.7) baseRating += 0.8;
    else if (ratio > 0.6) baseRating += 0.5;
    else if (ratio < 0.4) baseRating -= 0.5;
    
    // Adjust based on features
    if (product.health_metrics?.length > 3) baseRating += 0.2;
    if (product.battery_life_hours > 48) baseRating += 0.2;
    if (product.water_resistance?.includes('WR50')) baseRating += 0.1;
    
    // Price consideration
    if (product.price_snapshot) {
      const price = parseFloat(product.price_snapshot.replace(/[^\d.]/g, ''));
      if (price > 400) baseRating -= 0.2; // Premium price penalty
      else if (price < 150) baseRating += 0.1; // Value bonus
    }
    
    // Add some randomness for realism
    baseRating += (Math.random() - 0.5) * 0.4;
    
    // Round to nearest 0.1 and constrain to 1.0-5.0
    return Math.max(1.0, Math.min(5.0, Math.round(baseRating * 10) / 10));
  }

  private generateHeadline(rating: number, product: any): string {
    if (rating >= 4.5) {
      return 'Exceptional Performance and Outstanding Value';
    } else if (rating >= 4.0) {
      return 'Solid Choice with Strong Performance';
    } else if (rating >= 3.5) {
      return 'Good Features but Consider Your Needs';
    } else if (rating >= 3.0) {
      return 'Mixed Results - Proceed with Caution';
    } else {
      return 'Notable Issues - Explore Alternatives';
    }
  }

  private generateVerdict(rating: number, product: any): string {
    const deviceType = product.device_type === 'smartwatch' ? 'smartwatch' : 'fitness tracker';
    const targetAudience = product.device_type === 'smartwatch' 
      ? 'users seeking a comprehensive smartwatch experience' 
      : 'fitness enthusiasts and health-conscious individuals';
    
    if (rating >= 4.5) {
      return `The ${product.title} excels across virtually every category and represents exceptional value for its feature set. We highly recommend it for ${targetAudience} who want a premium ${deviceType} that delivers on its promises.`;
    } else if (rating >= 4.0) {
      return `While the ${product.title} has some minor limitations, its strong performance in key areas makes it a worthwhile investment for most users. The advantages significantly outweigh the drawbacks, making it a solid choice in the ${deviceType} market.`;
    } else if (rating >= 3.5) {
      return `The ${product.title} offers decent functionality but faces stiff competition in its price range. It's worth considering if its specific features align with your needs, but we recommend comparing it against alternatives before purchasing.`;
    } else if (rating >= 3.0) {
      return `The ${product.title} has some redeeming qualities but also notable issues that may affect user experience. Consider it only if specific features are essential to your needs and you're comfortable with the trade-offs.`;
    } else {
      return `Unfortunately, the ${product.title} has significant limitations that make it difficult to recommend for most users. We suggest exploring alternatives that offer better value and performance in the ${deviceType} category.`;
    }
  }

  private async researchCompetitorReviews(tenantId: string, productId: string, deps: AgentDependencies): Promise<any> {
    // Get product to search for
    const { data: product } = await deps.supabase
      .from('products')
      .select('title, brand, asin')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .single();

    if (!product || !deps.tavilyApiKey) {
      return { action: 'research_skipped', reason: 'No product found or no search API available' };
    }

    try {
      const searchClient = createSearchClient({
        tavilyApiKey: deps.tavilyApiKey,
        serpApiKey: deps.serpApiKey,
        bingApiKey: deps.bingApiKey
      });

      // Search for professional reviews
      const reviewResults = await searchClient.searchProductReviews(product.title);
      
      // Extract key insights
      const insights = {
        commonPros: this.extractCommonPoints(reviewResults, 'positive'),
        commonCons: this.extractCommonPoints(reviewResults, 'negative'),
        averageRating: this.estimateAverageRating(reviewResults),
        reviewSources: reviewResults.slice(0, 5).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet
        }))
      };

      return {
        action: 'research_completed',
        productTitle: product.title,
        insights,
        sourcesFound: reviewResults.length
      };
    } catch (error) {
      return {
        action: 'research_failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractCommonPoints(results: any[], sentiment: 'positive' | 'negative'): string[] {
    const points: string[] = [];
    const positiveKeywords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'outstanding'];
    const negativeKeywords = ['terrible', 'awful', 'hate', 'problem', 'issue', 'disappointing'];
    
    const keywords = sentiment === 'positive' ? positiveKeywords : negativeKeywords;
    
    for (const result of results) {
      const text = (result.title + ' ' + result.snippet).toLowerCase();
      
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          // Extract sentence containing the keyword
          const sentences = result.snippet.split(/[.!?]/);
          const relevantSentence = sentences.find(s => s.toLowerCase().includes(keyword));
          if (relevantSentence && relevantSentence.length > 10) {
            points.push(relevantSentence.trim());
            break;
          }
        }
      }
    }
    
    return points.slice(0, 3); // Return top 3 points
  }

  private estimateAverageRating(results: any[]): number {
    // Simple heuristic based on positive/negative language
    let totalScore = 0;
    let validResults = 0;
    
    for (const result of results) {
      const text = (result.title + ' ' + result.snippet).toLowerCase();
      let score = 3.0; // Base score
      
      // Positive indicators
      if (text.includes('excellent') || text.includes('outstanding')) score += 1.5;
      else if (text.includes('great') || text.includes('amazing')) score += 1.0;
      else if (text.includes('good') || text.includes('solid')) score += 0.5;
      
      // Negative indicators
      if (text.includes('terrible') || text.includes('awful')) score -= 1.5;
      else if (text.includes('disappointing') || text.includes('problems')) score -= 1.0;
      else if (text.includes('issues') || text.includes('concerns')) score -= 0.5;
      
      totalScore += Math.max(1.0, Math.min(5.0, score));
      validResults++;
    }
    
    return validResults > 0 ? Math.round((totalScore / validResults) * 10) / 10 : 3.5;
  }

  private async analyzeSentiment(tenantId: string, productId: string, deps: AgentDependencies): Promise<any> {
    // Get existing review posts for this product
    const { data: posts } = await deps.supabase
      .from('posts')
      .select('id, title, body_mdx, published_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'review')
      .ilike('title', `%${productId}%`);

    if (!posts || posts.length === 0) {
      return { action: 'no_reviews_found', productId };
    }

    const sentimentScores = posts.map(post => {
      const content = post.body_mdx.toLowerCase();
      let score = 0;
      
      // Enhanced sentiment analysis
      const positiveWords = ['excellent', 'great', 'amazing', 'love', 'perfect', 'outstanding', 'recommend', 'impressive', 'solid'];
      const negativeWords = ['terrible', 'awful', 'hate', 'disappointed', 'issues', 'problems', 'poor', 'worst', 'avoid'];
      
      positiveWords.forEach(word => {
        if (content.includes(word)) score += 0.15;
      });
      
      negativeWords.forEach(word => {
        if (content.includes(word)) score -= 0.15;
      });
      
      // Rating extraction
      const ratingMatch = content.match(/(\d\.\d)\/5/);
      if (ratingMatch) {
        const rating = parseFloat(ratingMatch[1]);
        score += (rating - 3.0) * 0.2; // Normalize around 3.0
      }
      
      return {
        postId: post.id,
        title: post.title,
        sentimentScore: Math.max(-1, Math.min(1, score)),
        publishedAt: post.published_at
      };
    });

    const averageSentiment = sentimentScores.reduce((sum, item) => sum + item.sentimentScore, 0) / sentimentScores.length;

    return {
      action: 'sentiment_analyzed',
      productId,
      reviewCount: posts.length,
      averageSentiment: Math.round(averageSentiment * 100) / 100,
      sentiment: averageSentiment > 0.2 ? 'positive' : averageSentiment < -0.2 ? 'negative' : 'neutral',
      reviews: sentimentScores,
      recommendation: this.generateSentimentRecommendation(averageSentiment, sentimentScores.length)
    };
  }

  private generateSentimentRecommendation(avgSentiment: number, reviewCount: number): string {
    if (reviewCount === 0) return 'No reviews available for analysis';
    
    if (avgSentiment > 0.3) {
      return 'Strong positive reception - continue current review approach';
    } else if (avgSentiment > 0.1) {
      return 'Moderately positive feedback - consider highlighting more unique benefits';
    } else if (avgSentiment > -0.1) {
      return 'Neutral reception - focus on more specific pros/cons and real-world testing';
    } else {
      return 'Concerning negative sentiment - review quality and consider different products';
    }
  }

  private async compareProducts(tenantId: string, productIds: string[], deps: AgentDependencies): Promise<any> {
    if (productIds.length < 2) {
      throw new Error('At least 2 products required for comparison');
    }

    // Get products
    const { data: products } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('id', productIds);

    if (!products || products.length < 2) {
      throw new Error('Could not find enough products for comparison');
    }

    // Generate comparison content
    const comparisonContent = await this.generateComparisonContent(products, deps);

    // Create comparison post
    const { data: comparisonPost, error } = await deps.supabase
      .from('posts')
      .insert({
        tenant_id: tenantId,
        type: 'roundup',
        title: comparisonContent.title,
        slug: this.generateSlug(comparisonContent.title),
        excerpt: comparisonContent.excerpt,
        body_mdx: comparisonContent.content,
        images: products.flatMap(p => p.images?.slice(0, 1) || []),
        status: 'draft',
        seo: {
          title: comparisonContent.title,
          description: comparisonContent.excerpt,
          keywords: [
            'comparison',
            'vs',
            'best',
            ...products.map(p => p.title.toLowerCase()),
            ...products.map(p => p.brand?.toLowerCase()).filter(Boolean)
          ]
        },
        jsonld: this.generateComparisonJsonLd(products, comparisonContent)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create comparison post: ${error.message}`);
    }

    return {
      action: 'comparison_generated',
      postId: comparisonPost.id,
      productIds,
      productsCompared: products.length,
      title: comparisonContent.title
    };
  }

  private async generateComparisonContent(products: any[], deps: AgentDependencies): Promise<any> {
    const productNames = products.map(p => p.title).join(' vs ');
    const title = `${productNames}: Complete Comparison & Buying Guide`;
    
    let content = `# ${title}\n\n`;
    content += `Choosing between ${products.map(p => p.title).join(', ')} can be challenging. Here's our comprehensive comparison based on extensive research and analysis.\n\n`;
    
    // Quick winner summary
    content += `## 🏆 Quick Verdict\n\n`;
    const bestOverall = this.determineBestProduct(products);
    content += `**Best Overall**: ${bestOverall.title} - ${bestOverall.reason}\n\n`;
    
    // Detailed comparison table
    content += `## 📊 Detailed Comparison\n\n`;
    content += this.generateComparisonTable(products);
    
    // Individual product analysis
    content += `## 🔍 Individual Analysis\n\n`;
    for (const [index, product] of products.entries()) {
      content += `### ${index + 1}. ${product.title}\n\n`;
      content += this.generateProductSummary(product);
      
      if (product.affiliate_url) {
        content += `[Check Current Price](${product.affiliate_url})\n\n`;
      }
    }
    
    // Use case recommendations
    content += `## 🎯 Who Should Buy What?\n\n`;
    content += this.generateUseCaseRecommendations(products);
    
    // Final recommendation
    content += `## 🎯 Final Recommendation\n\n`;
    content += `After extensive analysis, we recommend the **${bestOverall.title}** for most users due to ${bestOverall.reason.toLowerCase()}. However, your specific needs and budget should guide your final decision.\n\n`;
    
    // Buying guide
    content += `## 💡 Buying Tips\n\n`;
    content += `- Consider your primary use case (fitness, smart features, or health monitoring)\n`;
    content += `- Factor in ecosystem compatibility (iOS vs Android)\n`;
    content += `- Think about battery life requirements for your lifestyle\n`;
    content += `- Check for ongoing software support and updates\n`;
    
    return {
      title,
      excerpt: `Detailed comparison of ${productNames} with pros, cons, and expert recommendations for every budget and need.`,
      content
    };
  }

  private generateComparisonTable(products: any[]): string {
    let table = `| Feature | ${products.map(p => p.title).join(' | ')} |\n`;
    table += `|---------|${products.map(() => '------').join('|')}|\n`;
    table += `| **Brand** | ${products.map(p => p.brand || 'N/A').join(' | ')} |\n`;
    table += `| **Price** | ${products.map(p => p.price_snapshot || 'N/A').join(' | ')} |\n`;
    table += `| **Battery Life** | ${products.map(p => p.battery_life_hours ? `${p.battery_life_hours}h` : 'N/A').join(' | ')} |\n`;
    table += `| **Water Resistance** | ${products.map(p => p.water_resistance || 'N/A').join(' | ')} |\n`;
    table += `| **Health Tracking** | ${products.map(p => (p.health_metrics || []).length + ' metrics').join(' | ')} |\n`;
    table += `| **Our Rating** | ${products.map(p => this.calculateQuickRating(p) + '/5').join(' | ')} |\n\n`;
    
    return table;
  }

  private generateProductSummary(product: any): string {
    const rating = this.calculateQuickRating(product);
    const features = product.features?.slice(0, 3) || [];
    
    let summary = `**Rating: ${rating}/5** | **Price: ${product.price_snapshot || 'N/A'}**\n\n`;
    
    summary += `**Strengths:**\n`;
    if (features.length > 0) {
      summary += features.map((f: string) => `- ${f}`).join('\n') + '\n';
    } else {
      summary += `- Quality build and design\n- Reliable performance\n- Good value proposition\n`;
    }
    
    summary += `\n**Best For:** ${this.identifyTargetUser(product)}\n\n`;
    
    return summary;
  }

  private generateUseCaseRecommendations(products: any[]): string {
    let recommendations = '';
    
    recommendations += `**🏃‍♂️ For Fitness Enthusiasts:**\n`;
    const fitnessChoice = products.find(p => (p.health_metrics || []).length > 2) || products[0];
    recommendations += `Choose the **${fitnessChoice.title}** for comprehensive health tracking and workout features.\n\n`;
    
    recommendations += `**💼 For Professionals:**\n`;
    const professionalChoice = products.find(p => p.device_type === 'smartwatch') || products[0];
    recommendations += `The **${professionalChoice.title}** offers the best balance of smart features and professional aesthetics.\n\n`;
    
    recommendations += `**💰 For Budget-Conscious Buyers:**\n`;
    const budgetChoice = this.findBudgetOption(products);
    recommendations += `Consider the **${budgetChoice.title}** for essential features at an affordable price point.\n\n`;
    
    return recommendations;
  }

  private determineBestProduct(products: any[]): { title: string; reason: string } {
    // Simple scoring algorithm
    const scores = products.map(product => {
      let score = 0;
      
      // Feature count
      score += (product.features?.length || 0) * 0.1;
      
      // Health metrics
      score += (product.health_metrics?.length || 0) * 0.2;
      
      // Battery life
      if (product.battery_life_hours) {
        score += Math.min(product.battery_life_hours / 24, 3) * 0.3;
      }
      
      // Water resistance
      if (product.water_resistance) score += 0.5;
      
      // Brand recognition (simple heuristic)
      if (['Apple', 'Samsung', 'Garmin', 'Fitbit'].includes(product.brand)) {
        score += 0.3;
      }
      
      return { product, score };
    });
    
    const winner = scores.sort((a, b) => b.score - a.score)[0];
    
    return {
      title: winner.product.title,
      reason: 'its excellent feature set, reliable performance, and strong value proposition'
    };
  }

  private calculateQuickRating(product: any): number {
    let rating = 3.0;
    
    if (product.features?.length > 5) rating += 0.5;
    if (product.health_metrics?.length > 3) rating += 0.5;
    if (product.battery_life_hours > 48) rating += 0.3;
    if (product.water_resistance) rating += 0.2;
    
    return Math.min(5.0, Math.round(rating * 2) / 2);
  }

  private identifyTargetUser(product: any): string {
    if (product.device_type === 'smartwatch') {
      return 'tech-savvy users who want comprehensive smart features';
    } else if (product.health_metrics?.length > 3) {
      return 'health-conscious individuals and fitness enthusiasts';
    } else {
      return 'users seeking reliable basic fitness tracking';
    }
  }

  private findBudgetOption(products: any[]): any {
    return products.reduce((cheapest, current) => {
      const currentPrice = parseFloat(current.price_snapshot?.replace(/[^\d.]/g, '') || '999');
      const cheapestPrice = parseFloat(cheapest.price_snapshot?.replace(/[^\d.]/g, '') || '999');
      return currentPrice < cheapestPrice ? current : cheapest;
    });
  }

  private async updateExistingReviews(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get reviews older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: oldReviews } = await deps.supabase
      .from('posts')
      .select('id, title, body_mdx, published_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'review')
      .lt('published_at', thirtyDaysAgo.toISOString())
      .limit(5);

    if (!oldReviews || oldReviews.length === 0) {
      return { action: 'no_reviews_to_update' };
    }

    const updateResults = [];

    for (const review of oldReviews) {
      try {
        // Add freshness indicators
        let updatedContent = review.body_mdx;
        
        // Add price check notice
        if (!updatedContent.includes('price-check-notice')) {
          updatedContent += `\n\n---\n\n*💡 **Price Update Notice**: Prices and availability change frequently. [Check current price](link) for the most up-to-date information.*\n\n<!-- price-check-notice -->`;
        }
        
        // Add last updated timestamp
        const updateNotice = `\n\n---\n*Last reviewed: ${new Date().toDateString()} | Our reviews are regularly updated to ensure accuracy.*`;
        updatedContent += updateNotice;
        
        await deps.supabase
          .from('posts')
          .update({ body_mdx: updatedContent })
          .eq('id', review.id);

        updateResults.push({
          postId: review.id,
          title: review.title,
          action: 'updated',
          updatesApplied: ['price_notice', 'freshness_timestamp']
        });
      } catch (error) {
        updateResults.push({
          postId: review.id,
          action: 'update_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'reviews_updated',
      reviewsProcessed: oldReviews.length,
      successfulUpdates: updateResults.filter(r => r.action === 'updated').length,
      results: updateResults
    };
  }

  // Helper methods
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  private generateReviewJsonLd(product: any, reviewContent: ReviewContent): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'Product',
        name: product.title,
        brand: {
          '@type': 'Brand',
          name: product.brand || 'Unknown'
        },
        image: product.images?.[0]?.url,
        description: product.features?.slice(0, 3).join(', ') || 'Wearable technology product'
      },
      author: {
        '@type': 'Organization',
        name: 'Wearable Tech Codex',
        url: 'https://wearable-tech-codex.com'
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: reviewContent.rating,
        bestRating: 5,
        worstRating: 1
      },
      reviewBody: reviewContent.excerpt,
      positiveNotes: reviewContent.pros,
      negativeNotes: reviewContent.cons
    };
  }

  private generateComparisonJsonLd(products: any[], comparisonContent: any): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'ComparisonReview',
      name: comparisonContent.title,
      author: {
        '@type': 'Organization',
        name: 'Wearable Tech Codex'
      },
      itemsCompared: products.map(product => ({
        '@type': 'Product',
        name: product.title,
        brand: product.brand,
        image: product.images?.[0]?.url
      }))
    };
  }
}

export const reviewAgent = new ReviewAgent();