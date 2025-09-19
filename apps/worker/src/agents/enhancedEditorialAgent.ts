import { BaseAgent } from './baseAgent';
import { HumanizerAgent } from './humanizerAgent';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export class EnhancedEditorialAgent extends BaseAgent {
  private openai: OpenAI;
  private humanizer: HumanizerAgent;
  private supabase: any;

  constructor() {
    super('enhanced-editorial');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.humanizer = new HumanizerAgent();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async execute(context: any): Promise<any> {
    const { tenantId, topic, products = [], competitorUrls = [] } = context;
    
    try {
      // Research phase
      const research = await this.conductResearch(topic, competitorUrls);
      
      // Generate initial content
      const rawContent = await this.generateArticle(topic, products, research);
      
      // Humanize the content
      const humanizedResult = await this.humanizer.execute({
        content: rawContent.content,
        type: 'blog',
        metadata: { topic, products }
      });
      
      // Generate metadata
      const metadata = await this.generateMetadata(
        rawContent.title, 
        humanizedResult.humanizedContent,
        products
      );
      
      // Store the article
      const article = await this.storeArticle(
        tenantId,
        rawContent.title,
        humanizedResult.humanizedContent,
        metadata,
        products
      );
      
      return {
        success: true,
        article,
        metrics: {
          wordCount: humanizedResult.humanizedContent.split(/\s+/).length,
          readabilityScore: humanizedResult.metrics.readabilityScore,
          productsMentioned: products.length,
          researchSources: research.sources.length
        }
      };
    } catch (error) {
      console.error('Error in enhanced editorial agent:', error);
      throw error;
    }
  }

  private async conductResearch(topic: string, competitorUrls: string[]): Promise<any> {
    // In production, this would fetch real competitor content
    // For now, we'll simulate research insights
    return {
      sources: competitorUrls,
      insights: [
        'Most competitors focus on technical specs rather than real-world usage',
        'Common pain points: battery life, comfort, app connectivity',
        'Price comparisons are highly valued by readers',
        'Personal experiences and specific scenarios resonate most'
      ],
      trends: [
        'AI-powered health insights gaining traction',
        'Sleep tracking accuracy improving significantly',
        'Integration with smart home devices becoming standard'
      ]
    };
  }

  private async generateArticle(
    topic: string, 
    products: any[], 
    research: any
  ): Promise<{ title: string; content: string }> {
    
    const productContext = products.map(p => 
      `${p.name} - $${p.price} - Key features: ${p.features?.slice(0, 3).join(', ')}`
    ).join('\n');

    const prompt = `Write a comprehensive blog article about: ${topic}

Research insights:
${research.insights.join('\n')}

Current trends:
${research.trends.join('\n')}

Products to naturally mention:
${productContext}

Guidelines:
- Start with a compelling personal anecdote or surprising fact
- Include specific product recommendations with real prices
- Add practical tips from actual usage
- Compare products with specific details
- Include both pros and cons honestly
- Mention real-world scenarios (morning jogs, work meetings, sleep tracking)
- Use conversational transitions between sections
- End with actionable next steps, not a generic conclusion

Write the full article with natural section breaks. Make it informative but conversational.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a wearable tech enthusiast who writes detailed, helpful content. You test products yourself and share honest opinions. You know readers want specific recommendations and real experiences, not marketing fluff.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content || '';
    
    // Extract title from content or generate one
    const titleMatch = content.match(/^#\s+(.+)/);
    const title = titleMatch 
      ? titleMatch[1] 
      : topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return { title, content };
  }

  private async generateMetadata(title: string, content: string, products: any[]): Promise<any> {
    // Extract key points for meta description
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
    const metaDescription = sentences[0]?.trim().substring(0, 155) + '...';
    
    // Generate FAQ based on content
    const faqPrompt = `Based on this article about ${title}, generate 5 FAQ questions and answers that readers would actually ask. Keep answers concise and helpful.

Article excerpt: ${content.substring(0, 1000)}`;

    const faqResponse = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: faqPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const faqContent = faqResponse.choices[0].message.content || '';
    
    // Parse FAQ into structured format
    const faqs = this.parseFAQ(faqContent);
    
    return {
      metaTitle: title.substring(0, 60),
      metaDescription,
      keywords: this.extractKeywords(content),
      faq: faqs,
      jsonLd: this.generateJsonLd(title, metaDescription, faqs, products),
      lastModified: new Date().toISOString(),
      author: 'Tech Review Team',
      category: 'Wearable Technology'
    };
  }

  private parseFAQ(faqContent: string): any[] {
    const faqs: any[] = [];
    const lines = faqContent.split('\n');
    let currentQ = '';
    let currentA = '';
    
    for (const line of lines) {
      if (line.match(/^(Q:|Question:|\d+\.)/i)) {
        if (currentQ && currentA) {
          faqs.push({ question: currentQ, answer: currentA });
        }
        currentQ = line.replace(/^(Q:|Question:|\d+\.)/i, '').trim();
        currentA = '';
      } else if (line.match(/^(A:|Answer:)/i)) {
        currentA = line.replace(/^(A:|Answer:)/i, '').trim();
      } else if (currentA && line.trim()) {
        currentA += ' ' + line.trim();
      }
    }
    
    if (currentQ && currentA) {
      faqs.push({ question: currentQ, answer: currentA });
    }
    
    return faqs.slice(0, 5);
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const words = content.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !commonWords.has(w));
    
    const frequency: Record<string, number> = {};
    words.forEach(w => frequency[w] = (frequency[w] || 0) + 1);
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateJsonLd(title: string, description: string, faqs: any[], products: any[]): any {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      author: {
        '@type': 'Person',
        name: 'Tech Review Team'
      },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      publisher: {
        '@type': 'Organization',
        name: 'Wearable Tech Codex'
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://wearabletechcodex.com/blog/${title.toLowerCase().replace(/\s+/g, '-')}`
      }
    };

    if (faqs.length > 0) {
      (jsonLd as any).mainEntity = {
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      };
    }

    if (products.length > 0) {
      (jsonLd as any).mentions = products.map(p => ({
        '@type': 'Product',
        name: p.name,
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'USD'
        }
      }));
    }

    return jsonLd;
  }

  private async storeArticle(
    tenantId: string,
    title: string,
    content: string,
    metadata: any,
    products: any[]
  ): Promise<any> {
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);

    const { data, error } = await this.supabase
      .from('posts')
      .insert({
        tenant_id: tenantId,
        title,
        slug,
        excerpt: metadata.metaDescription,
        body_mdx: content,
        body_html: this.markdownToHtml(content),
        type: 'review',
        status: 'published',
        published_at: new Date().toISOString(),
        seo_title: metadata.metaTitle,
        seo_description: metadata.metaDescription,
        seo_keywords: metadata.keywords,
        jsonld: metadata.jsonLd,
        metadata: {
          faq: metadata.faq,
          author: metadata.author,
          category: metadata.category,
          readingTime: Math.ceil(content.split(/\s+/).length / 200),
          lastModified: metadata.lastModified
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Link products to post
    if (products.length > 0 && data) {
      await this.supabase
        .from('post_products')
        .insert(
          products.map(p => ({
            post_id: data.id,
            product_id: p.id
          }))
        );
    }

    return data;
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }
}