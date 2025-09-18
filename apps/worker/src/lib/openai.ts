import OpenAI from 'openai';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIClient {
  private client: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.defaultModel = config.model || 'gpt-4-turbo-preview';
    this.defaultTemperature = config.temperature || 0.7;
    this.defaultMaxTokens = config.maxTokens || 2000;
  }

  async generateContent(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature || this.defaultTemperature,
      max_tokens: options?.maxTokens || this.defaultMaxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateStructuredContent<T>(
    prompt: string,
    schema: Record<string, any>,
    options?: {
      model?: string;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<T> {
    const systemPrompt = `${options?.systemPrompt || ''}\n\nRespond with valid JSON that matches this schema: ${JSON.stringify(schema)}`;
    
    const content = await this.generateContent(prompt, {
      ...options,
      systemPrompt,
      temperature: options?.temperature || 0.3, // Lower temperature for structured output
    });

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${content}`);
    }
  }

  async generateBatch(
    prompts: string[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<string[]> {
    const promises = prompts.map(prompt => 
      this.generateContent(prompt, options)
    );
    
    return Promise.all(promises);
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0]?.embedding || [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return response.data.map(item => item.embedding);
  }

  async moderateContent(content: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
  }> {
    const response = await this.client.moderations.create({
      input: content,
    });

    const result = response.results[0];
    return {
      flagged: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
    };
  }
}

export function createOpenAIClient(apiKey: string, config?: Partial<OpenAIConfig>): OpenAIClient {
  return new OpenAIClient({
    apiKey,
    ...config,
  });
}