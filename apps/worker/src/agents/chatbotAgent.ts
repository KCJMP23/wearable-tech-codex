import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult } from './base';

interface ChatbotAgentInput {
  tenantId: string;
  action: 'answer_question' | 'update_knowledge_base' | 'analyze_conversations' | 'improve_responses' | 'moderate_content';
  userQuestion?: string;
  userId?: string;
  conversationId?: string;
  context?: string[];
}

interface ChatResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    type: 'post' | 'product' | 'kb' | 'web_search';
    title: string;
    url?: string;
    relevance: number;
  }>;
  disclaimers: string[];
  suggestedActions: string[];
}

export class ChatbotAgent extends BaseAgent {
  name = 'ChatbotAgent';
  description = 'RAG-powered chatbot that answers questions using posts, products, and KB with web search fallback';
  version = '1.0.0';

  private readonly medicalDisclaimer = 'This information is for educational purposes only and should not replace professional medical advice.';
  private readonly affiliateDisclaimer = 'Some links may be affiliate links. We may earn a commission if you purchase through these links.';

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as ChatbotAgentInput;
      
      switch (input.action) {
        case 'answer_question':
          return await this.answerQuestion(input.tenantId, input.userQuestion!, input.userId, deps);
        case 'update_knowledge_base':
          return await this.updateKnowledgeBase(input.tenantId, deps);
        case 'analyze_conversations':
          return await this.analyzeConversations(input.tenantId, deps);
        case 'improve_responses':
          return await this.improveResponses(input.tenantId, deps);
        case 'moderate_content':
          return await this.moderateContent(input.tenantId, input.userQuestion!, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async answerQuestion(
    tenantId: string, 
    question: string, 
    userId?: string, 
    deps?: AgentDependencies
  ): Promise<any> {
    // Step 1: Analyze question intent and extract key terms
    const questionAnalysis = this.analyzeQuestion(question);
    
    // Step 2: Search knowledge base using vector similarity
    const kbResults = await this.searchKnowledgeBase(tenantId, question, questionAnalysis.keywords, deps!);
    
    // Step 3: If confidence is low, perform web search
    let webResults = [];
    if (kbResults.maxConfidence < 0.7) {
      webResults = await this.performWebSearch(question, questionAnalysis.keywords);
    }
    
    // Step 4: Generate response using available information
    const response = await this.generateResponse(
      question,
      questionAnalysis,
      kbResults,
      webResults,
      deps!
    );
    
    // Step 5: Apply content moderation and disclaimers
    const moderatedResponse = this.applyModerationAndDisclaimers(response, questionAnalysis);
    
    // Step 6: Log conversation for analytics
    await this.logConversation(tenantId, question, moderatedResponse, userId, deps!);

    return {
      action: 'question_answered',
      question,
      response: moderatedResponse,
      confidence: moderatedResponse.confidence,
      sourcesUsed: moderatedResponse.sources.length,
      requiresHumanReview: moderatedResponse.confidence < 0.5
    };
  }

  private async updateKnowledgeBase(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get recent posts and products for embedding
    const { data: recentPosts } = await deps.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    const { data: recentProducts } = await deps.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Generate embeddings for new content
    const updatedEmbeddings = [];
    
    for (const post of recentPosts || []) {
      const embedding = await this.generateEmbedding(post.title + ' ' + post.excerpt);
      
      await deps.supabase
        .from('embeddings')
        .upsert({
          tenant_id: tenantId,
          ref_table: 'posts',
          ref_id: post.id,
          content: post.title + ' ' + post.excerpt,
          embedding
        });
      
      updatedEmbeddings.push({ type: 'post', id: post.id });
    }

    for (const product of recentProducts || []) {
      const embedding = await this.generateEmbedding(
        product.title + ' ' + (product.features || []).join(' ')
      );
      
      await deps.supabase
        .from('embeddings')
        .upsert({
          tenant_id: tenantId,
          ref_table: 'products',
          ref_id: product.id,
          content: product.title + ' ' + (product.features || []).join(' '),
          embedding
        });
      
      updatedEmbeddings.push({ type: 'product', id: product.id });
    }

    return {
      action: 'knowledge_base_updated',
      postsIndexed: recentPosts?.length || 0,
      productsIndexed: recentProducts?.length || 0,
      totalEmbeddings: updatedEmbeddings.length
    };
  }

  private async analyzeConversations(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Mock conversation analysis - in real implementation, analyze actual chat logs
    const analysis = {
      totalConversations: 245,
      averageConfidence: 0.78,
      commonTopics: [
        'battery life comparison',
        'waterproof ratings',
        'fitness tracking accuracy',
        'smartwatch recommendations'
      ],
      lowConfidenceQuestions: [
        'medical device regulations',
        'specific health conditions',
        'technical troubleshooting'
      ],
      userSatisfaction: 4.2,
      responseTime: 1.8 // seconds
    };

    return {
      action: 'conversations_analyzed',
      period: '30_days',
      metrics: analysis,
      improvements: this.generateConversationImprovements(analysis),
      knowledgeGaps: this.identifyKnowledgeGaps(analysis)
    };
  }

  private async improveResponses(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Analyze low-confidence responses and improve them
    const improvements = await this.analyzeAndImproveResponses(tenantId, deps);
    
    return {
      action: 'responses_improved',
      responsesAnalyzed: improvements.analyzed,
      improvementsImplemented: improvements.implemented,
      confidenceIncrease: improvements.avgConfidenceIncrease
    };
  }

  private async moderateContent(tenantId: string, question: string, deps: AgentDependencies): Promise<any> {
    const moderation = this.performContentModeration(question);
    
    return {
      action: 'content_moderated',
      question,
      isAppropriate: moderation.appropriate,
      flags: moderation.flags,
      suggestedResponse: moderation.suggestedResponse
    };
  }

  // Helper methods
  private analyzeQuestion(question: string): any {
    const healthRelated = /health|medical|heart|blood|pressure|condition|disease|treatment/i.test(question);
    const productComparison = /compare|vs|versus|better|best|difference/i.test(question);
    const recommendation = /recommend|suggest|should I|which|what/i.test(question);
    const technical = /battery|waterproof|specs|features|how to/i.test(question);

    const keywords = question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);

    return {
      intent: healthRelated ? 'health' : productComparison ? 'comparison' : recommendation ? 'recommendation' : 'general',
      keywords,
      requiresDisclaimer: healthRelated,
      complexity: question.split(' ').length > 15 ? 'high' : 'medium'
    };
  }

  private async searchKnowledgeBase(
    tenantId: string, 
    question: string, 
    keywords: string[], 
    deps: AgentDependencies
  ): Promise<any> {
    // Mock vector similarity search
    const mockResults = [
      {
        type: 'post',
        title: 'Best Smartwatch Battery Life Guide',
        content: 'Comprehensive guide to smartwatch battery optimization...',
        confidence: 0.85,
        url: '/blog/smartwatch-battery-guide'
      },
      {
        type: 'product',
        title: 'Apple Watch Series 9',
        content: 'Features heart rate monitoring, ECG, and 18-hour battery life...',
        confidence: 0.72,
        url: '/products/apple-watch-series-9'
      }
    ];

    return {
      results: mockResults,
      maxConfidence: Math.max(...mockResults.map(r => r.confidence)),
      totalMatches: mockResults.length
    };
  }

  private async performWebSearch(question: string, keywords: string[]): Promise<any[]> {
    // Mock web search results - in real implementation, use Tavily or search API
    return [
      {
        type: 'web_search',
        title: 'Expert Review: Smartwatch Accuracy Study',
        content: 'Recent study shows 95% accuracy in heart rate monitoring...',
        confidence: 0.60,
        url: 'https://example.com/smartwatch-study'
      }
    ];
  }

  private async generateResponse(
    question: string,
    analysis: any,
    kbResults: any,
    webResults: any[],
    deps: AgentDependencies
  ): Promise<ChatResponse> {
    const allSources = [...kbResults.results, ...webResults];
    const topSources = allSources
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    // Generate response based on sources and question intent
    const answer = this.synthesizeAnswer(question, analysis, topSources);
    const confidence = this.calculateResponseConfidence(topSources, analysis);

    return {
      answer,
      confidence,
      sources: topSources.map(source => ({
        type: source.type,
        title: source.title,
        url: source.url,
        relevance: source.confidence
      })),
      disclaimers: [],
      suggestedActions: this.generateSuggestedActions(analysis, topSources)
    };
  }

  private synthesizeAnswer(question: string, analysis: any, sources: any[]): string {
    if (sources.length === 0) {
      return "I don't have enough information to answer that question accurately. Could you provide more details or try rephrasing your question?";
    }

    const topSource = sources[0];
    
    // Generate contextual response based on intent
    switch (analysis.intent) {
      case 'recommendation':
        return `Based on our analysis, ${topSource.content.substring(0, 200)}... For the most current recommendations, I'd suggest checking our detailed guides.`;
      
      case 'comparison':
        return `When comparing these options, ${topSource.content.substring(0, 200)}... Each has unique advantages depending on your specific needs.`;
      
      case 'health':
        return `From a general wellness perspective, ${topSource.content.substring(0, 200)}... However, please consult with healthcare professionals for personalized advice.`;
      
      default:
        return `${topSource.content.substring(0, 300)}... You can find more detailed information in our comprehensive guides.`;
    }
  }

  private calculateResponseConfidence(sources: any[], analysis: any): number {
    if (sources.length === 0) return 0.1;
    
    const avgSourceConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
    const intentBonus = analysis.intent === 'general' ? 0.1 : 0;
    const sourceCountBonus = Math.min(sources.length * 0.05, 0.15);
    
    return Math.min(0.95, avgSourceConfidence + intentBonus + sourceCountBonus);
  }

  private generateSuggestedActions(analysis: any, sources: any[]): string[] {
    const actions = [];
    
    if (analysis.intent === 'recommendation') {
      actions.push('Take our product quiz for personalized recommendations');
      actions.push('Browse our top-rated products');
    }
    
    if (analysis.intent === 'comparison') {
      actions.push('View detailed comparison guides');
      actions.push('Check current prices and availability');
    }
    
    if (sources.some(s => s.type === 'product')) {
      actions.push('View product details and reviews');
    }
    
    return actions.slice(0, 3);
  }

  private applyModerationAndDisclaimers(response: ChatResponse, analysis: any): ChatResponse {
    const disclaimers = [...response.disclaimers];
    
    if (analysis.requiresDisclaimer) {
      disclaimers.push(this.medicalDisclaimer);
    }
    
    if (response.sources.some(s => s.type === 'product')) {
      disclaimers.push(this.affiliateDisclaimer);
    }
    
    return {
      ...response,
      disclaimers
    };
  }

  private async logConversation(
    tenantId: string, 
    question: string, 
    response: ChatResponse, 
    userId?: string, 
    deps?: AgentDependencies
  ): Promise<void> {
    await deps!.supabase
      .from('insights')
      .insert({
        tenant_id: tenantId,
        kpi: 'chatbot_interaction',
        value: response.confidence,
        window: 'conversation',
        meta: {
          question,
          confidence: response.confidence,
          sourcesUsed: response.sources.length,
          userId,
          timestamp: new Date().toISOString()
        },
        computed_at: new Date().toISOString()
      });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation - in real implementation, use OpenAI embeddings
    const dimensions = 1536; // OpenAI text-embedding-3-small dimensions
    return Array.from({ length: dimensions }, () => Math.random() - 0.5);
  }

  private generateConversationImprovements(analysis: any): string[] {
    const improvements = [];
    
    if (analysis.averageConfidence < 0.8) {
      improvements.push('Expand knowledge base with more detailed content');
    }
    
    if (analysis.responseTime > 2) {
      improvements.push('Optimize embedding search for faster responses');
    }
    
    improvements.push('Add more specialized content for low-confidence topics');
    improvements.push('Implement conversation context awareness');
    
    return improvements;
  }

  private identifyKnowledgeGaps(analysis: any): string[] {
    return analysis.lowConfidenceQuestions.map((topic: string) => 
      `Need more content about: ${topic}`
    );
  }

  private async analyzeAndImproveResponses(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Mock response improvement analysis
    return {
      analyzed: 50,
      implemented: 15,
      avgConfidenceIncrease: 0.12
    };
  }

  private performContentModeration(question: string): any {
    const inappropriate = /spam|abuse|offensive/i.test(question);
    const medical = /diagnose|cure|treatment|prescription/i.test(question);
    
    return {
      appropriate: !inappropriate,
      flags: inappropriate ? ['inappropriate_content'] : medical ? ['medical_advice'] : [],
      suggestedResponse: medical 
        ? 'I cannot provide medical advice. Please consult with a healthcare professional.'
        : inappropriate 
        ? 'I cannot respond to inappropriate content.'
        : null
    };
  }
}

export const chatbotAgent = new ChatbotAgent();