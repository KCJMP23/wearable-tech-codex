import { BaseAgent, AgentTask, AgentDependencies, AgentResult } from './base';
import OpenAI from 'openai';

export class HumanizerAgent extends BaseAgent {
  name = 'humanizer';
  description = 'Humanizes AI-generated content to sound natural and conversational';
  version = '1.0.0';
  
  private openai: OpenAI;

  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    const { content, type = 'blog', metadata = {} } = task.input;
    
    if (!content) {
      throw new Error('Content is required for humanization');
    }

    try {
      const humanizedContent = await this.humanizeContent(content, type, metadata);
      
      return {
        success: true,
        data: {
          originalContent: content,
          humanizedContent,
          metrics: {
            originalLength: content.length,
            humanizedLength: humanizedContent.length,
            readabilityScore: this.calculateReadability(humanizedContent),
          }
        }
      };
    } catch (error) {
      console.error('Error humanizing content:', error);
      throw error;
    }
  }

  private async humanizeContent(content: string, type: string, metadata: any): Promise<string> {
    const writingStyleRules = `
You're here to make content sound real and conversational. Follow these rules:

CORE PRINCIPLES:
- Write like you're explaining to a friend over coffee
- Short sentences. Sometimes fragments work
- Start sentences with "and" or "but" when it feels natural
- Use "you" and "your" to speak directly to readers
- Mix sentence lengths - short, medium, long - to create natural rhythm

AVOID THESE AI GIVEAWAYS:
- "dive into" / "unleash" / "transform" / "revolutionary" 
- "In today's fast-paced world" / "In our digital age"
- Forced transitions like "Moreover" / "Furthermore"
- Perfect grammar all the time - real people don't write that way
- Marketing speak or hype language
- Semicolons, excessive commas, formal structures

MAKE IT REAL:
- Include specific details and examples
- Reference actual products, real prices, genuine user experiences  
- Add personal observations: "I noticed..." / "What surprised me..."
- Use casual language: "honestly" / "turns out" / "here's the thing"
- Numbers and stats should be specific, not rounded perfectly
- Sometimes lowercase "i" is fine if that's your style

FOR WEARABLE TECH CONTENT:
- Talk about real issues: battery dying mid-workout, straps that smell, screens you can't see in sunlight
- Mention specific models and actual prices
- Compare to things people know: "about as thick as two credit cards"
- Include practical tips: "charge it while you shower"
- Reference actual use cases: morning runs, sleep tracking, meeting notifications

STRUCTURE:
- Start with the most interesting point, not an introduction
- Use subheadings that ask questions or make statements
- Keep paragraphs short - 2-3 sentences often
- End sections when the point is made, not with a summary
`;

    const prompt = type === 'blog' 
      ? `Rewrite this blog content to sound completely natural and human. The reader should feel like they're getting advice from a knowledgeable friend who actually uses wearable tech daily.

${writingStyleRules}

Original content:
${content}

Rewrite this to sound genuinely human. Keep all factual information but change the voice completely. Add specific product mentions, real prices, and personal observations where appropriate.`
      : `Humanize this ${type} content following natural writing patterns:

${writingStyleRules}

Content: ${content}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a content humanizer specializing in making AI-generated text sound naturally human. You understand the nuances of casual writing, conversational tone, and authentic voice. Never use AI-sounding phrases or overly polished language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 4000,
    });

    return response.choices[0].message.content || content;
  }

  private calculateReadability(text: string): number {
    // Simple readability score based on sentence and word length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Lower scores are better (simpler writing)
    // Target: 8-12 words per sentence, 4-5 characters per word
    const sentenceScore = Math.abs(avgWordsPerSentence - 10) / 10;
    const wordScore = Math.abs(avgWordLength - 4.5) / 4.5;
    
    return Math.max(0, 100 - (sentenceScore + wordScore) * 50);
  }
}