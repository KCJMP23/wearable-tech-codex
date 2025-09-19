import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';

interface EditorialAgentInput {
  tenantId: string;
  action: 'generate_posts' | 'generate_daily_post' | 'analyze_top_content' | 'update_post' | 'optimize_seo';
  type?: 'howto' | 'listicle' | 'answer' | 'review' | 'roundup' | 'alternative' | 'evergreen' | 'mixed';
  count?: number;
  topics?: string[];
  postId?: string;
  keywords?: string[];
  targetWordCount?: number;
}

interface PostTemplate {
  type: string;
  title: string;
  outline: string[];
  requiredSections: string[];
  targetWordCount: number;
  seoFocus: string[];
}

interface GeneratedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  type: string;
  images: Array<{ url: string; alt: string; description: string }>;
  internalLinks: string[];
  externalLinks: Array<{ url: string; anchor: string; description: string }>;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  jsonLd: Record<string, any>;
  estimatedReadTime: number;
}

export class EditorialAgent extends BaseAgent {
  name = 'EditorialAgent';
  description = 'Generates high-quality content posts using AI, with proper SEO, internal/external links, and JSON-LD';
  version = '1.0.0';

  private readonly contentTemplates: Record<string, PostTemplate> = {
    howto: {
      type: 'howto',
      title: 'How to [Action] with [Device/Category]',
      outline: ['Introduction', 'Prerequisites', 'Step-by-step guide', 'Tips and tricks', 'Troubleshooting', 'Conclusion'],
      requiredSections: ['introduction', 'steps', 'conclusion'],
      targetWordCount: 1200,
      seoFocus: ['how to', 'guide', 'tutorial', 'setup']
    },
    listicle: {
      type: 'listicle',
      title: '[Number] Best [Category] for [Use Case] in [Year]',
      outline: ['Introduction', 'Selection criteria', 'Product reviews', 'Comparison table', 'Buying guide', 'Conclusion'],
      requiredSections: ['introduction', 'products', 'comparison', 'conclusion'],
      targetWordCount: 1800,
      seoFocus: ['best', 'top', 'reviews', 'comparison']
    },
    answer: {
      type: 'answer',
      title: '[Question] - Complete Answer & Analysis',
      outline: ['Question overview', 'Quick answer', 'Detailed explanation', 'Related considerations', 'Expert insights', 'Conclusion'],
      requiredSections: ['question', 'answer', 'explanation'],
      targetWordCount: 800,
      seoFocus: ['answer', 'explained', 'guide', 'help']
    },
    review: {
      type: 'review',
      title: '[Product] Review - Honest Testing & Analysis',
      outline: ['Introduction', 'Specifications', 'Testing methodology', 'Performance analysis', 'Pros and cons', 'Alternatives', 'Verdict'],
      requiredSections: ['introduction', 'analysis', 'pros_cons', 'verdict'],
      targetWordCount: 1500,
      seoFocus: ['review', 'tested', 'pros', 'cons']
    },
    roundup: {
      type: 'roundup',
      title: 'Best [Category] of [Year] - Complete Buyer\'s Guide',
      outline: ['Market overview', 'Selection methodology', 'Top picks', 'Category breakdown', 'Buying advice', 'FAQ'],
      requiredSections: ['overview', 'picks', 'buying_guide'],
      targetWordCount: 2000,
      seoFocus: ['best', 'buyer guide', 'recommendations', 'top rated']
    },
    alternative: {
      type: 'alternative',
      title: '[Product] Alternatives - [Number] Better Options',
      outline: ['Why look for alternatives', 'Selection criteria', 'Alternative options', 'Detailed comparisons', 'Recommendations'],
      requiredSections: ['alternatives', 'comparisons', 'recommendations'],
      targetWordCount: 1200,
      seoFocus: ['alternative', 'vs', 'comparison', 'better']
    },
    evergreen: {
      type: 'evergreen',
      title: 'The Complete Guide to [Topic]',
      outline: ['Introduction', 'Fundamentals', 'Advanced concepts', 'Common mistakes', 'Best practices', 'Future trends'],
      requiredSections: ['fundamentals', 'practices', 'conclusion'],
      targetWordCount: 2500,
      seoFocus: ['guide', 'complete', 'everything', 'ultimate']
    }
  };

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as EditorialAgentInput;
      
      switch (input.action) {
        case 'generate_posts':
          return await this.generatePosts(input.tenantId, input.type, input.count, input.topics, deps);
        case 'generate_daily_post':
          return await this.generateDailyPost(input.tenantId, deps);
        case 'analyze_top_content':
          return await this.analyzeTopContent(input.tenantId, deps);
        case 'update_post':
          return await this.updatePost(input.tenantId, input.postId!, deps);
        case 'optimize_seo':
          return await this.optimizeSEO(input.tenantId, input.postId!, input.keywords, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async generatePosts(
    tenantId: string, 
    type: string = 'mixed', 
    count: number = 5, 
    topics?: string[], 
    deps?: AgentDependencies
  ): Promise<any> {
    const generatedPosts = [];
    const errors = [];

    // Get tenant context
    const tenantData = await this.getTenantContext(tenantId, deps!);
    
    // Generate trending topics if not provided
    const contentTopics = topics || await this.generateTopics(tenantData, count, deps!);

    for (let i = 0; i < count; i++) {
      try {
        const postType = type === 'mixed' ? this.selectRandomPostType() : type;
        const topic = contentTopics[i % contentTopics.length];
        
        const post = await this.generateSinglePost(tenantId, postType, topic, tenantData, deps!);
        
        // Save post to database
        const savedPost = await this.savePost(tenantId, post, deps!);
        generatedPosts.push({
          postId: savedPost.id,
          title: post.title,
          type: post.type,
          wordCount: post.content.split(' ').length
        });
        
      } catch (error) {
        errors.push({
          index: i,
          topic: contentTopics[i % contentTopics.length],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      action: 'posts_generated',
      postsCreated: generatedPosts.length,
      posts: generatedPosts,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async generateDailyPost(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get current date and check if post already exists for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingPost } = await deps.supabase
      .from('posts')
      .select('id, title')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .single();

    if (existingPost) {
      return {
        action: 'daily_post_exists',
        postId: existingPost.id,
        title: existingPost.title
      };
    }

    // Generate topic based on trending/seasonal content
    const tenantData = await this.getTenantContext(tenantId, deps);
    const dailyTopic = await this.generateDailyTopic(tenantData, deps);
    const postType = this.selectDailyPostType();
    
    const post = await this.generateSinglePost(tenantId, postType, dailyTopic, tenantData, deps);
    const savedPost = await this.savePost(tenantId, post, deps);

    return {
      action: 'daily_post_generated',
      postId: savedPost.id,
      title: post.title,
      type: post.type,
      topic: dailyTopic
    };
  }

  private async analyzeTopContent(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get top performing posts
    const { data: topPosts } = await deps.supabase
      .from('posts')
      .select('id, title, type, published_at, excerpt')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    if (!topPosts || topPosts.length === 0) {
      return { action: 'no_content_to_analyze' };
    }

    // Analyze patterns
    const analysis = {
      totalPosts: topPosts.length,
      typeDistribution: this.analyzeContentTypes(topPosts),
      topicPatterns: this.extractTopicPatterns(topPosts),
      performanceInsights: await this.generatePerformanceInsights(topPosts, deps),
      recommendations: this.generateContentRecommendations(topPosts)
    };

    // Store insights
    await deps.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'content_analysis',
        value: analysis.totalPosts,
        window: 'monthly',
        meta: analysis,
        computed_at: new Date().toISOString()
      });

    return {
      action: 'content_analyzed',
      ...analysis
    };
  }

  private async updatePost(tenantId: string, postId: string, deps: AgentDependencies): Promise<any> {
    // Get existing post
    const { data: post } = await deps.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', postId)
      .single();

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Generate updated content
    const tenantData = await this.getTenantContext(tenantId, deps);
    const updatedContent = await this.refreshPostContent(post, tenantData, deps);

    // Update post
    const { error } = await deps.supabase
      .from('posts')
      .update({
        body_mdx: updatedContent.content,
        excerpt: updatedContent.excerpt,
        seo: updatedContent.seo,
        images: updatedContent.images
      })
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return {
      action: 'post_updated',
      postId,
      updatedSections: ['content', 'seo', 'images'],
      newWordCount: updatedContent.content.split(' ').length
    };
  }

  private async optimizeSEO(tenantId: string, postId: string, keywords?: string[], deps?: AgentDependencies): Promise<any> {
    // Get post
    const { data: post } = await deps!.supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Analyze current SEO
    const currentSEO = post.seo || {};
    const contentAnalysis = this.analyzeContentSEO(post.body_mdx || '');
    
    // Generate optimized SEO
    const optimizedSEO = await this.generateOptimizedSEO(post, keywords, contentAnalysis, deps!);

    // Update post
    const { error } = await deps!.supabase
      .from('posts')
      .update({
        seo: optimizedSEO,
        title: optimizedSEO.title || post.title
      })
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to optimize SEO: ${error.message}`);
    }

    return {
      action: 'seo_optimized',
      postId,
      improvements: this.compareSEO(currentSEO, optimizedSEO),
      newSEO: optimizedSEO
    };
  }

  // Helper methods
  private async getTenantContext(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get tenant info
    const { data: tenant } = await deps.supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    // Get taxonomy
    const { data: taxonomy } = await deps.supabase
      .from('taxonomy')
      .select('*')
      .eq('tenant_id', tenantId);

    // Get recent products
    const { data: products } = await deps.supabase
      .from('products')
      .select('id, title, category, device_type, asin')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      tenant: tenant || {},
      taxonomy: taxonomy || [],
      products: products || [],
      niche: tenant?.name || 'Technology Products'
    };
  }

  private async generateTopics(tenantData: any, count: number, deps: AgentDependencies): Promise<string[]> {
    // Mock topic generation - in real implementation, use trends analysis
    const baseTopics = [
      'Best device features for performance tracking',
      'How to choose the right smart device',
      'Comparing top activity trackers',
      'Smart technology trends',
      'Performance monitoring devices review',
      'Wellness tracking accuracy analysis',
      'Battery life optimization tips',
      'Durability standards explained',
      'Performance monitor comparison',
      'Smart notifications setup guide'
    ];

    // Personalize for tenant
    const personalizedTopics = baseTopics.map(topic => 
      topic.replace('smart device', tenantData.niche.toLowerCase())
    );

    return personalizedTopics.slice(0, count);
  }

  private selectRandomPostType(): string {
    const types = ['howto', 'listicle', 'answer', 'review', 'roundup', 'alternative'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private selectDailyPostType(): string {
    // Prefer shorter content for daily posts
    const dailyTypes = ['howto', 'answer', 'review'];
    return dailyTypes[Math.floor(Math.random() * dailyTypes.length)];
  }

  private async generateDailyTopic(tenantData: any, deps: AgentDependencies): Promise<string> {
    // Generate topic based on current date, trends, or seasonal content
    const seasonalTopics = this.getSeasonalTopics();
    const trendingTopics = await this.getTrendingTopics(tenantData.niche, deps);
    
    return trendingTopics[0] || seasonalTopics[0] || 'Essential wearable device guide';
  }

  private getSeasonalTopics(): string[] {
    const month = new Date().getMonth();
    const seasonalMap: Record<number, string[]> = {
      0: ['New Year goals with smart tech', 'Winter activity tracking'],
      1: ['Valentine\'s Day tech gifts', 'Indoor activity tracking'],
      2: ['Spring preparation', 'Outdoor activity monitoring'],
      3: ['Easter tech deals', 'Spring cleaning device maintenance'],
      4: ['Mother\'s Day smart gifts', 'Spring activity challenges'],
      5: ['Father\'s Day tech guide', 'Summer activity preparation'],
      6: ['Summer activity tracking', 'Vacation tech essentials'],
      7: ['Back to school tech', 'Late summer activities'],
      8: ['Fall routine optimization', 'Back to work wellness'],
      9: ['Halloween tech fun', 'Autumn wellness monitoring'],
      10: ['Black Friday deals', 'Holiday gift guides'],
      11: ['Holiday tech gifts', 'Year-end performance review']
    };

    return seasonalMap[month] || ['Essential smart device guide'];
  }

  private async getTrendingTopics(niche: string, deps: AgentDependencies): Promise<string[]> {
    // Mock trending topics - in real implementation, use TrendsAgent or web search
    return [
      `${niche} innovations for 2024`,
      `${niche} buying guide`,
      `${niche} troubleshooting tips`
    ];
  }

  private async generateSinglePost(
    tenantId: string, 
    type: string, 
    topic: string, 
    tenantData: any, 
    deps: AgentDependencies
  ): Promise<GeneratedPost> {
    const template = this.contentTemplates[type];
    if (!template) {
      throw new Error(`Unknown post type: ${type}`);
    }

    // Generate content using AI (mock implementation)
    const content = await this.generatePostContent(template, topic, tenantData, deps);
    
    return {
      title: content.title,
      slug: this.generateSlug(content.title),
      excerpt: content.excerpt,
      content: content.body,
      type,
      images: content.images,
      internalLinks: content.internalLinks,
      externalLinks: content.externalLinks,
      seo: content.seo,
      jsonLd: content.jsonLd,
      estimatedReadTime: Math.ceil(content.body.split(' ').length / 200)
    };
  }

  private async generatePostContent(template: PostTemplate, topic: string, tenantData: any, deps: AgentDependencies): Promise<any> {
    // Mock AI content generation - in real implementation, use OpenAI/Claude
    const title = this.generateTitle(template, topic, tenantData);
    const outline = this.generateOutline(template, topic);
    const body = this.generateBody(template, topic, outline, tenantData);
    
    return {
      title,
      excerpt: this.generateExcerpt(body),
      body,
      images: await this.generateImageRequirements(template, topic),
      internalLinks: await this.findInternalLinks(tenantData, topic, deps),
      externalLinks: this.generateExternalLinks(topic),
      seo: this.generateSEOData(title, body, template.seoFocus),
      jsonLd: this.generateJSONLD(template.type, title, body)
    };
  }

  private generateTitle(template: PostTemplate, topic: string, tenantData: any): string {
    const year = new Date().getFullYear();
    const baseTitle = template.title
      .replace('[Year]', year.toString())
      .replace('[Category]', tenantData.niche)
      .replace('[Topic]', topic);

    // Customize based on type
    switch (template.type) {
      case 'howto':
        return topic.startsWith('How to') ? topic : `How to ${topic}`;
      case 'listicle':
        return `7 Best ${topic} in ${year}`;
      case 'answer':
        return topic.endsWith('?') ? topic : `${topic} - Complete Guide`;
      case 'review':
        return `${topic} Review - Honest Analysis & Testing`;
      case 'roundup':
        return `Best ${topic} of ${year} - Complete Buyer's Guide`;
      case 'alternative':
        return `${topic} Alternatives - Better Options to Consider`;
      case 'evergreen':
        return `The Complete Guide to ${topic}`;
      default:
        return baseTitle;
    }
  }

  private generateOutline(template: PostTemplate, topic: string): string[] {
    return template.outline.map(section => 
      section.replace('[Topic]', topic).replace('[Year]', new Date().getFullYear().toString())
    );
  }

  private generateBody(template: PostTemplate, topic: string, outline: string[], tenantData: any): string {
    const sections = outline.map(section => this.generateSection(section, topic, template.type, tenantData));
    
    return [
      `# ${this.generateTitle(template, topic, tenantData)}`,
      '',
      this.generateIntroduction(topic, template.type),
      '',
      ...sections.flat(),
      '',
      this.generateConclusion(topic, template.type),
      '',
      this.generateCTA(tenantData.niche)
    ].join('\n');
  }

  private generateSection(sectionTitle: string, topic: string, type: string, tenantData: any): string[] {
    const section = [
      `## ${sectionTitle}`,
      ''
    ];

    // Generate section content based on type
    switch (type) {
      case 'howto':
        section.push(this.generateHowToSection(sectionTitle, topic));
        break;
      case 'listicle':
        section.push(this.generateListicleSection(sectionTitle, topic, tenantData));
        break;
      case 'review':
        section.push(this.generateReviewSection(sectionTitle, topic));
        break;
      default:
        section.push(this.generateGenericSection(sectionTitle, topic));
    }

    section.push('');
    return section;
  }

  private generateIntroduction(topic: string, type: string): string {
    const intros = {
      howto: `Learning ${topic} can seem challenging at first, but with the right approach and tools, it becomes straightforward. In this comprehensive guide, we'll walk you through everything you need to know.`,
      listicle: `Finding the right products for ${topic} requires careful research and comparison. We've tested and analyzed the top options to help you make an informed decision.`,
      review: `Our in-depth review of ${topic} provides honest insights based on real-world testing and analysis. Here's what you need to know before making a purchase.`,
      answer: `This comprehensive answer to ${topic} covers all the essential information you need, backed by expert research and practical insights.`
    };

    return intros[type as keyof typeof intros] || `This guide covers everything you need to know about ${topic}.`;
  }

  private generateHowToSection(sectionTitle: string, topic: string): string {
    if (sectionTitle.toLowerCase().includes('step')) {
      return `Follow these steps to ${topic}:

1. **Preparation**: Ensure you have all necessary equipment and have read the manufacturer's instructions.
2. **Setup**: Configure your device settings according to your preferences and requirements.
3. **Testing**: Verify that everything is working correctly before proceeding.
4. **Optimization**: Fine-tune settings for optimal performance and accuracy.

Each step is crucial for achieving the best results.`;
    }

    return `This section covers important considerations for ${sectionTitle.toLowerCase()} when working with ${topic}.`;
  }

  private generateListicleSection(sectionTitle: string, topic: string, tenantData: any): string {
    if (sectionTitle.toLowerCase().includes('product') || sectionTitle.toLowerCase().includes('review')) {
      return `Here are our top picks for ${topic}:

### 1. Premium Choice
- **Features**: Advanced functionality with comprehensive tracking
- **Best For**: Users who want the most complete feature set
- **Price Range**: Premium tier
- **Rating**: 4.5/5

### 2. Best Value
- **Features**: Excellent balance of features and affordability
- **Best For**: Most users seeking solid performance
- **Price Range**: Mid-tier
- **Rating**: 4.3/5

### 3. Budget Option
- **Features**: Essential functionality at an accessible price
- **Best For**: Entry-level users or budget-conscious buyers
- **Price Range**: Budget-friendly
- **Rating**: 4.0/5

[View Latest Prices on Amazon](https://amazon.com)`;
    }

    return `This section provides detailed information about ${sectionTitle.toLowerCase()} related to ${topic}.`;
  }

  private generateReviewSection(sectionTitle: string, topic: string): string {
    if (sectionTitle.toLowerCase().includes('pros')) {
      return `**What We Like:**
- Excellent build quality and durability
- Comprehensive feature set
- Accurate tracking and measurements
- User-friendly interface
- Strong battery life

**Areas for Improvement:**
- Premium pricing
- Learning curve for advanced features
- Limited customization options`;
    }

    return `Our analysis of ${sectionTitle.toLowerCase()} for ${topic} reveals important insights for potential buyers.`;
  }

  private generateGenericSection(sectionTitle: string, topic: string): string {
    return `This section covers ${sectionTitle.toLowerCase()} aspects of ${topic}, providing valuable insights and practical information for readers.`;
  }

  private generateConclusion(topic: string, type: string): string {
    const conclusions = {
      howto: `Following this guide for ${topic} will help you achieve the best results. Remember to take your time with each step and don't hesitate to refer back to this guide as needed.`,
      listicle: `These top choices for ${topic} represent the best options currently available. Consider your specific needs, budget, and preferences when making your final decision.`,
      review: `Our review of ${topic} shows it to be a solid choice for most users. While it has some limitations, the overall performance and feature set make it worth considering.`,
      answer: `This comprehensive answer to ${topic} should provide you with the information needed to make informed decisions. Stay updated with the latest developments in this area.`
    };

    return conclusions[type as keyof typeof conclusions] || `This guide to ${topic} provides the essential information you need.`;
  }

  private generateCTA(niche: string): string {
    return `**Ready to explore more ${niche.toLowerCase()} options?** Browse our complete guides and reviews to find the perfect device for your needs.

*Disclosure: This post contains affiliate links. We may earn a commission if you purchase through these links, at no additional cost to you.*`;
  }

  private generateExcerpt(body: string): string {
    // Extract first meaningful paragraph
    const paragraphs = body.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
    const firstParagraph = paragraphs[0] || '';
    
    return firstParagraph.length > 160 
      ? firstParagraph.substring(0, 157) + '...'
      : firstParagraph;
  }

  private async generateImageRequirements(template: PostTemplate, topic: string): Promise<Array<{ url: string; alt: string; description: string }>> {
    // Generate image requirements based on template
    const imageCount = template.type === 'review' ? 5 : template.type === 'listicle' ? 7 : 3;
    const images = [];

    for (let i = 0; i < imageCount; i++) {
      images.push({
        url: `https://example.com/images/${template.type}-${i + 1}.jpg`,
        alt: `${topic} - Image ${i + 1}`,
        description: `Illustrative image for ${topic} section ${i + 1}`
      });
    }

    return images;
  }

  private async findInternalLinks(tenantData: any, topic: string, deps: AgentDependencies): Promise<string[]> {
    // Find relevant internal content to link to
    const { data: relatedPosts } = await deps.supabase
      .from('posts')
      .select('slug, title')
      .eq('tenant_id', tenantData.tenant.id)
      .eq('status', 'published')
      .limit(5);

    return (relatedPosts || []).map(post => `/blog/${post.slug}`);
  }

  private generateExternalLinks(topic: string): Array<{ url: string; anchor: string; description: string }> {
    // Mock external links - in real implementation, use web search
    return [
      {
        url: 'https://example.com/research-study',
        anchor: 'recent research study',
        description: 'Supporting research data'
      },
      {
        url: 'https://example.com/expert-opinion',
        anchor: 'expert analysis',
        description: 'Expert opinion reference'
      }
    ];
  }

  private generateSEOData(title: string, body: string, seoFocus: string[]): any {
    const wordCount = body.split(' ').length;
    const readability = wordCount > 1000 ? 'comprehensive' : 'concise';
    
    return {
      title: title.length > 60 ? title.substring(0, 57) + '...' : title,
      description: this.generateMetaDescription(body),
      keywords: seoFocus.concat(this.extractKeywords(body, 5)),
      readability,
      wordCount
    };
  }

  private generateMetaDescription(body: string): string {
    // Extract first meaningful sentence
    const sentences = body.split('.').filter(s => s.trim() && !s.includes('#'));
    const firstSentence = sentences[0]?.trim() || '';
    
    return firstSentence.length > 160 
      ? firstSentence.substring(0, 157) + '...'
      : firstSentence + '.';
  }

  private extractKeywords(text: string, count: number): string[] {
    // Simple keyword extraction - in real implementation, use NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'more', 'than'].includes(word));

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([word]) => word);
  }

  private generateJSONLD(type: string, title: string, body: string): Record<string, any> {
    const baseJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': title,
      'description': this.generateMetaDescription(body),
      'author': {
        '@type': 'Organization',
        'name': 'Wearable Tech Review Team'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Wearable Tech Review Team'
      },
      'datePublished': new Date().toISOString(),
      'dateModified': new Date().toISOString()
    };

    // Add type-specific schema
    switch (type) {
      case 'review':
        return {
          ...baseJsonLd,
          '@type': 'Review',
          'itemReviewed': {
            '@type': 'Product',
            'name': title.replace(' Review', '').replace(' - Honest Analysis & Testing', '')
          }
        };
      case 'howto':
        return {
          ...baseJsonLd,
          '@type': 'HowTo',
          'name': title
        };
      default:
        return baseJsonLd;
    }
  }

  private async savePost(tenantId: string, post: GeneratedPost, deps: AgentDependencies): Promise<any> {
    const { data: savedPost, error } = await deps.supabase
      .from('posts')
      .insert({
        tenant_id: tenantId,
        type: post.type,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body_mdx: post.content,
        images: post.images,
        status: 'draft',
        seo: post.seo,
        jsonld: post.jsonLd
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save post: ${error.message}`);
    }

    return savedPost;
  }

  private analyzeContentTypes(posts: any[]): Record<string, number> {
    return posts.reduce((acc, post) => {
      acc[post.type] = (acc[post.type] || 0) + 1;
      return acc;
    }, {});
  }

  private extractTopicPatterns(posts: any[]): string[] {
    // Simple topic extraction from titles
    const topics = posts.map(post => 
      post.title.toLowerCase().split(' ').filter((word: string) => word.length > 4)
    ).flat();

    const frequency: Record<string, number> = {};
    topics.forEach(topic => {
      frequency[topic] = (frequency[topic] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private async generatePerformanceInsights(posts: any[], deps: AgentDependencies): Promise<string[]> {
    return [
      `Most frequent content type: ${this.analyzeContentTypes(posts)}`,
      `Average posts per month: ${posts.length / 3}`,
      'Strong performance in review content',
      'Opportunity to increase how-to guides'
    ];
  }

  private generateContentRecommendations(posts: any[]): string[] {
    const typeDistribution = this.analyzeContentTypes(posts);
    const recommendations = [];

    if (!typeDistribution.howto || typeDistribution.howto < 3) {
      recommendations.push('Increase how-to content for better user engagement');
    }

    if (!typeDistribution.listicle || typeDistribution.listicle < 2) {
      recommendations.push('Add more listicle content for improved SEO');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current content mix', 'Focus on seasonal topics');
    }

    return recommendations;
  }

  private async refreshPostContent(post: any, tenantData: any, deps: AgentDependencies): Promise<any> {
    // Refresh with current data and trends
    const updatedStats = await this.getCurrentStats();
    const freshContent = post.body_mdx.replace(/2023/g, '2024').replace(/2022/g, '2024');
    
    return {
      content: freshContent,
      excerpt: post.excerpt,
      seo: {
        ...post.seo,
        title: post.seo?.title?.replace(/2023/g, '2024')
      },
      images: post.images
    };
  }

  private async getCurrentStats(): Promise<any> {
    // Mock current stats - in real implementation, fetch real data
    return {
      year: new Date().getFullYear(),
      trends: ['AI integration', 'Health monitoring', 'Battery improvements']
    };
  }

  private analyzeContentSEO(content: string): any {
    const wordCount = content.split(' ').length;
    const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
    const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;

    return {
      wordCount,
      headingCount,
      linkCount,
      readabilityScore: wordCount > 1000 ? 0.8 : 0.6
    };
  }

  private async generateOptimizedSEO(post: any, keywords?: string[], contentAnalysis?: any, deps?: AgentDependencies): Promise<any> {
    const title = post.title;
    const content = post.body_mdx || '';
    
    return {
      title: title.length > 60 ? title.substring(0, 57) + '...' : title,
      description: this.generateMetaDescription(content),
      keywords: keywords || this.extractKeywords(content, 8),
      focusKeyword: keywords?.[0] || this.extractKeywords(content, 1)[0],
      optimizations: ['Title length optimized', 'Meta description enhanced', 'Keywords updated']
    };
  }

  private compareSEO(oldSEO: any, newSEO: any): string[] {
    const improvements = [];
    
    if (!oldSEO.description && newSEO.description) {
      improvements.push('Added meta description');
    }
    
    if ((oldSEO.keywords?.length || 0) < (newSEO.keywords?.length || 0)) {
      improvements.push('Expanded keyword targeting');
    }
    
    if (oldSEO.title?.length > 60 && newSEO.title?.length <= 60) {
      improvements.push('Optimized title length');
    }

    return improvements.length > 0 ? improvements : ['SEO metadata refreshed'];
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
      .replace(/-$/, '');
  }
}

export const editorialAgent = new EditorialAgent();