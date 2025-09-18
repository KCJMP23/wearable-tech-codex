import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from './env';

const cached = {
  openai: null as OpenAI | null,
  anthropic: null as Anthropic | null
};

export function getOpenAI(): OpenAI {
  if (!cached.openai) {
    const env = loadEnv();
    cached.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return cached.openai;
}

export function getAnthropic(): Anthropic {
  if (!cached.anthropic) {
    const env = loadEnv();
    cached.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return cached.anthropic;
}

export async function generateContent(prompt: string): Promise<string> {
  const openai = getOpenAI();
  const completion = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [{ role: 'user', content: prompt }]
  });
  const message = completion.output_text;
  if (!message) {
    throw new Error('OpenAI returned empty completion.');
  }
  return message.trim();
}

export async function generateStructuredJson<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
  const openai = getOpenAI();
  const completion = await openai.responses.parse({
    model: 'gpt-4.1-mini',
    input: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_schema', json_schema: { name: 'schema', schema } }
  });
  return completion.output[0]?.output_text ? JSON.parse(completion.output[0].output_text) : ({} as T);
}

export async function summarizeForInsight(prompt: string): Promise<string> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });
  const text = response.content.find((item) => item.type === 'text');
  if (!text || text.type !== 'text') {
    throw new Error('Anthropic response missing text content');
  }
  return text.text.trim();
}
